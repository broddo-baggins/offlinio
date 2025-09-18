/**
 * Local Analytics Service
 * 
 * Privacy-first analytics collection with optional telemetry:
 * - Local-only metrics aggregation
 * - Performance monitoring
 * - Error pattern analysis
 * - User flow insights
 * - Optional PostHog integration with explicit consent
 */

import fs from 'fs-extra';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export interface AnalyticsEvent {
  type: 'performance' | 'error' | 'user_action' | 'system_event';
  category: string;
  action: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp?: Date;
  sessionId?: string;
}

export interface PerformanceMetrics {
  catalogResponseTime: number[];
  downloadSpeed: number[];
  errorRate: number;
  memoryUsage: number[];
  diskUsage: number;
}

export interface UserFlowMetrics {
  installationSuccess: boolean;
  timeToFirstDownload: number;
  downloadSuccessRate: number;
  averageDownloadsPerSession: number;
  preferredQuality: string[];
}

export interface AnalyticsReport {
  period: { start: Date; end: Date };
  performanceMetrics: PerformanceMetrics;
  userFlowMetrics: UserFlowMetrics;
  errorPatterns: ErrorPattern[];
  recommendations: string[];
}

export interface ErrorPattern {
  errorType: string;
  frequency: number;
  category: 'network' | 'storage' | 'service' | 'content';
  suggestedFix: string;
}

export class LocalAnalyticsService {
  private prisma: PrismaClient;
  private metricsBuffer: AnalyticsEvent[] = [];
  private sessionId: string;
  private reportingInterval = 24 * 60 * 60 * 1000; // 24 hours
  private maxBufferSize = 1000; // Prevent memory bloat
  private analyticsDir: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.sessionId = this.generateSessionId();
    this.analyticsDir = path.join(process.cwd(), 'analytics');
    this.initializeAnalytics();
  }

  /**
   * Initialize analytics service
   */
  private async initializeAnalytics(): Promise<void> {
    try {
      await fs.ensureDir(this.analyticsDir);
      
      // Start periodic reporting
      setInterval(() => {
        this.generatePeriodicReport().catch(error => {
          logger.error('Failed to generate periodic analytics report:', error);
        });
      }, this.reportingInterval);

      logger.info('Local analytics service initialized', {
        sessionId: this.sessionId,
        analyticsDir: this.analyticsDir
      });
    } catch (error) {
      logger.error('Failed to initialize analytics service:', error);
    }
  }

  /**
   * Track performance metric
   */
  async trackPerformance(metric: string, value: number, metadata?: Record<string, any>): Promise<void> {
    await this.collectEvent({
      type: 'performance',
      category: 'performance',
      action: metric,
      value,
      metadata
    });
  }

  /**
   * Track user action
   */
  async trackUserAction(action: string, metadata?: Record<string, any>): Promise<void> {
    await this.collectEvent({
      type: 'user_action',
      category: 'user_flow',
      action,
      metadata
    });
  }

  /**
   * Track error occurrence
   */
  async trackError(error: string, category: string, metadata?: Record<string, any>): Promise<void> {
    await this.collectEvent({
      type: 'error',
      category,
      action: 'error_occurred',
      metadata: {
        error,
        ...metadata
      }
    });
  }

  /**
   * Track system event
   */
  async trackSystemEvent(event: string, metadata?: Record<string, any>): Promise<void> {
    await this.collectEvent({
      type: 'system_event',
      category: 'system',
      action: event,
      metadata
    });
  }

  /**
   * Collect analytics event
   */
  private async collectEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const enrichedEvent: AnalyticsEvent = {
        ...event,
        timestamp: new Date(),
        sessionId: this.sessionId
      };

      // Add to memory buffer
      this.metricsBuffer.push(enrichedEvent);

      // Prevent memory bloat
      if (this.metricsBuffer.length > this.maxBufferSize) {
        this.metricsBuffer = this.metricsBuffer.slice(-this.maxBufferSize);
      }

      // Persist important events immediately
      if (event.type === 'error' || event.category === 'user_flow') {
        await this.persistEvent(enrichedEvent);
      }

      logger.debug('Analytics event collected', {
        type: event.type,
        category: event.category,
        action: event.action
      });
    } catch (error) {
      logger.error('Failed to collect analytics event:', error);
    }
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateReport(periodDays: number = 7): Promise<AnalyticsReport> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));

    try {
      const events = await this.getEventsInPeriod(startDate, endDate);
      
      const report: AnalyticsReport = {
        period: { start: startDate, end: endDate },
        performanceMetrics: this.analyzePerformance(events),
        userFlowMetrics: this.analyzeUserFlow(events),
        errorPatterns: this.analyzeErrors(events),
        recommendations: this.generateRecommendations(events)
      };

      // Save report to file
      await this.saveReport(report);

      logger.info('Analytics report generated', {
        period: `${periodDays} days`,
        eventCount: events.length
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate analytics report:', error);
      throw error;
    }
  }

  /**
   * Analyze performance metrics
   */
  private analyzePerformance(events: AnalyticsEvent[]): PerformanceMetrics {
    const performanceEvents = events.filter(e => e.type === 'performance');
    
    const catalogResponseTimes = performanceEvents
      .filter(e => e.action === 'catalog_response_time')
      .map(e => e.value || 0);

    const downloadSpeeds = performanceEvents
      .filter(e => e.action === 'download_speed')
      .map(e => e.value || 0);

    const errorEvents = events.filter(e => e.type === 'error');
    const errorRate = events.length > 0 ? errorEvents.length / events.length : 0;

    const memoryUsages = performanceEvents
      .filter(e => e.action === 'memory_usage')
      .map(e => e.value || 0);

    const diskUsageEvent = performanceEvents
      .find(e => e.action === 'disk_usage');

    return {
      catalogResponseTime: catalogResponseTimes,
      downloadSpeed: downloadSpeeds,
      errorRate,
      memoryUsage: memoryUsages,
      diskUsage: diskUsageEvent?.value || 0
    };
  }

  /**
   * Analyze user flow metrics
   */
  private analyzeUserFlow(events: AnalyticsEvent[]): UserFlowMetrics {
    const userActions = events.filter(e => e.type === 'user_action');
    
    const installationEvents = userActions.filter(e => e.action === 'addon_installed');
    const downloadStartEvents = userActions.filter(e => e.action === 'download_started');
    const downloadCompleteEvents = userActions.filter(e => e.action === 'download_completed');

    const installationSuccess = installationEvents.length > 0;
    
    // Calculate time to first download
    let timeToFirstDownload = 0;
    if (installationEvents.length > 0 && downloadStartEvents.length > 0) {
      const installTime = installationEvents[0].timestamp!.getTime();
      const firstDownloadTime = downloadStartEvents[0].timestamp!.getTime();
      timeToFirstDownload = firstDownloadTime - installTime;
    }

    const downloadSuccessRate = downloadStartEvents.length > 0 
      ? downloadCompleteEvents.length / downloadStartEvents.length 
      : 0;

    const averageDownloadsPerSession = downloadStartEvents.length;

    const qualityPreferences = userActions
      .filter(e => e.action === 'quality_selected')
      .map(e => e.metadata?.quality)
      .filter(Boolean);

    return {
      installationSuccess,
      timeToFirstDownload,
      downloadSuccessRate,
      averageDownloadsPerSession,
      preferredQuality: qualityPreferences
    };
  }

  /**
   * Analyze error patterns
   */
  private analyzeErrors(events: AnalyticsEvent[]): ErrorPattern[] {
    const errorEvents = events.filter(e => e.type === 'error');
    const errorCounts = new Map<string, number>();
    const errorCategories = new Map<string, string>();

    for (const event of errorEvents) {
      const errorType = event.metadata?.error || event.action;
      errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
      
      if (event.category) {
        errorCategories.set(errorType, event.category);
      }
    }

    return Array.from(errorCounts.entries()).map(([errorType, frequency]) => ({
      errorType,
      frequency,
      category: errorCategories.get(errorType) as any || 'unknown',
      suggestedFix: this.getSuggestedFix(errorType)
    }));
  }

  /**
   * Generate improvement recommendations
   */
  private generateRecommendations(events: AnalyticsEvent[]): string[] {
    const recommendations: string[] = [];
    const performanceMetrics = this.analyzePerformance(events);
    const userFlowMetrics = this.analyzeUserFlow(events);
    const errorPatterns = this.analyzeErrors(events);

    // Performance recommendations
    const avgResponseTime = performanceMetrics.catalogResponseTime.length > 0
      ? performanceMetrics.catalogResponseTime.reduce((a, b) => a + b) / performanceMetrics.catalogResponseTime.length
      : 0;

    if (avgResponseTime > 500) {
      recommendations.push('Optimize catalog response time - currently averaging ' + Math.round(avgResponseTime) + 'ms');
    }

    if (performanceMetrics.errorRate > 0.05) {
      recommendations.push('High error rate detected (' + Math.round(performanceMetrics.errorRate * 100) + '%) - investigate error patterns');
    }

    // User flow recommendations
    if (userFlowMetrics.downloadSuccessRate < 0.9) {
      recommendations.push('Download success rate below 90% - improve error handling and retry logic');
    }

    if (userFlowMetrics.timeToFirstDownload > 300000) { // 5 minutes
      recommendations.push('Long time to first download - simplify onboarding process');
    }

    // Error pattern recommendations
    const commonErrors = errorPatterns.filter(p => p.frequency > 5);
    for (const error of commonErrors) {
      recommendations.push(`Address common ${error.category} error: ${error.errorType} (${error.frequency} occurrences)`);
    }

    return recommendations;
  }

  /**
   * Get suggested fix for error type
   */
  private getSuggestedFix(errorType: string): string {
    const fixes = new Map([
      ['ENOSPC', 'Implement disk space checking before downloads'],
      ['ECONNRESET', 'Add retry logic for network interruptions'],
      ['Real-Debrid limit', 'Show user-friendly message about daily limits'],
      ['Invalid token', 'Implement automatic token validation and refresh'],
      ['Permission denied', 'Guide user to select accessible download location']
    ]);

    return fixes.get(errorType) || 'Review error logs and implement appropriate handling';
  }

  /**
   * Persist event to database
   */
  private async persistEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await this.prisma.setting.create({
        data: {
          key: `analytics_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          value: JSON.stringify(event)
        }
      });
    } catch (error) {
      logger.debug('Failed to persist analytics event:', error);
    }
  }

  /**
   * Get events in time period
   */
  private async getEventsInPeriod(startDate: Date, endDate: Date): Promise<AnalyticsEvent[]> {
    try {
      // Get from memory buffer first
      const memoryEvents = this.metricsBuffer.filter(event => 
        event.timestamp && 
        event.timestamp >= startDate && 
        event.timestamp <= endDate
      );

      // Could also query persisted events from database
      // const persistedEvents = await this.queryPersistedEvents(startDate, endDate);

      return memoryEvents;
    } catch (error) {
      logger.error('Failed to get events in period:', error);
      return [];
    }
  }

  /**
   * Save report to file
   */
  private async saveReport(report: AnalyticsReport): Promise<void> {
    try {
      const filename = `analytics_report_${report.period.start.toISOString().split('T')[0]}.json`;
      const filepath = path.join(this.analyticsDir, filename);
      
      await fs.writeJson(filepath, report, { spaces: 2 });
      
      logger.info('Analytics report saved', { filepath });
    } catch (error) {
      logger.error('Failed to save analytics report:', error);
    }
  }

  /**
   * Generate periodic report
   */
  private async generatePeriodicReport(): Promise<void> {
    try {
      const report = await this.generateReport(1); // Daily report
      
      // Optional: Send to external service if user consented
      if (await this.shouldSendTelemetry()) {
        await this.sendTelemetry(report);
      }
    } catch (error) {
      logger.error('Failed to generate periodic report:', error);
    }
  }

  /**
   * Check if user consented to telemetry
   */
  private async shouldSendTelemetry(): Promise<boolean> {
    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'telemetry_consent' }
      });
      
      return setting?.value === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Send telemetry to external service (PostHog, etc.)
   */
  private async sendTelemetry(report: AnalyticsReport): Promise<void> {
    try {
      // Implementation would depend on chosen service (PostHog, Mixpanel, etc.)
      logger.debug('Telemetry data prepared for transmission', {
        eventCount: report.performanceMetrics.catalogResponseTime.length,
        errorCount: report.errorPatterns.length
      });
    } catch (error) {
      logger.error('Failed to send telemetry:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get analytics summary for dashboard
   */
  async getAnalyticsSummary(): Promise<{
    sessionsToday: number;
    errorsToday: number;
    averageResponseTime: number;
    downloadSuccessRate: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEvents = this.metricsBuffer.filter(event => 
      event.timestamp && event.timestamp >= today
    );

    const performanceEvents = todayEvents.filter(e => e.type === 'performance');
    const errorEvents = todayEvents.filter(e => e.type === 'error');
    const downloadStartEvents = todayEvents.filter(e => e.action === 'download_started');
    const downloadCompleteEvents = todayEvents.filter(e => e.action === 'download_completed');

    const responseTimes = performanceEvents
      .filter(e => e.action === 'catalog_response_time')
      .map(e => e.value || 0);

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b) / responseTimes.length
      : 0;

    const downloadSuccessRate = downloadStartEvents.length > 0
      ? downloadCompleteEvents.length / downloadStartEvents.length
      : 1;

    return {
      sessionsToday: 1, // Current session
      errorsToday: errorEvents.length,
      averageResponseTime,
      downloadSuccessRate
    };
  }
}
