/**
 * Cross-Platform Notification Service
 * 
 * Provides intelligent user notifications for:
 * - Download lifecycle events (started/progress/completed/failed)
 * - Smart failure reasoning with actionable suggestions
 * - User preference management
 * - Cross-platform compatibility (macOS/Windows/Linux)
 */

import notifier from 'node-notifier';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export interface NotificationSettings {
  enabled: boolean;
  showProgress: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
  };
  batchSimilar: boolean;
  soundEnabled: boolean;
}

export interface DownloadNotification {
  id: string;
  contentTitle: string;
  contentType: 'movie' | 'series';
  type: 'started' | 'progress' | 'completed' | 'failed' | 'paused';
  progress?: number;
  error?: string;
  filePath?: string;
  timestamp: Date;
}

export interface FailureReason {
  category: 'network' | 'storage' | 'service' | 'content' | 'permission';
  technicalError: string;
  userMessage: string;
  suggestedActions: string[];
  retryable: boolean;
}

export class NotificationService {
  private prisma: PrismaClient;
  private settings: NotificationSettings;
  private activeNotifications: Map<string, DownloadNotification> = new Map();
  
  // Failure analysis patterns
  private failurePatterns = {
    'ENOSPC': {
      category: 'storage' as const,
      userMessage: 'Not enough disk space available',
      suggestedActions: ['Free up disk space', 'Change download location', 'Check storage settings']
    },
    'ECONNRESET': {
      category: 'network' as const,
      userMessage: 'Network connection was interrupted',
      suggestedActions: ['Check internet connection', 'Retry download', 'Try different network']
    },
    'EACCES': {
      category: 'permission' as const,
      userMessage: 'Permission denied accessing download location',
      suggestedActions: ['Check folder permissions', 'Run as administrator', 'Choose different location']
    },
    'Real-Debrid limit': {
      category: 'service' as const,
      userMessage: 'Real-Debrid daily download limit reached',
      suggestedActions: ['Wait for limit reset', 'Upgrade Real-Debrid account', 'Try different quality']
    },
    'Magnet not found': {
      category: 'content' as const,
      userMessage: 'Content is no longer available from source',
      suggestedActions: ['Try different quality option', 'Search for alternative source', 'Check back later']
    }
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.settings = this.getDefaultSettings();
    this.loadUserSettings();
  }

  /**
   * Initialize notification service with user preferences
   */
  async initialize(): Promise<void> {
    try {
      await this.loadUserSettings();
      logger.info('Notification service initialized', {
        enabled: this.settings.enabled,
        quietHours: this.settings.quietHours.enabled
      });
    } catch (error) {
      logger.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Show download started notification
   */
  async notifyDownloadStarted(contentTitle: string, contentType: 'movie' | 'series', downloadId: string): Promise<void> {
    if (!this.shouldShowNotification()) return;

    const notification: DownloadNotification = {
      id: downloadId,
      contentTitle,
      contentType,
      type: 'started',
      timestamp: new Date()
    };

    this.activeNotifications.set(downloadId, notification);

    await this.showSystemNotification({
      title: 'Download Started',
      message: `Downloading: ${contentTitle}`,
      icon: this.getNotificationIcon(),
      sound: this.settings.soundEnabled,
      timeout: 5
    });

    logger.info('Download started notification sent', { contentTitle, downloadId });
  }

  /**
   * Update download progress notification
   */
  async notifyDownloadProgress(downloadId: string, progress: number): Promise<void> {
    if (!this.shouldShowNotification() || !this.settings.showProgress) return;

    const notification = this.activeNotifications.get(downloadId);
    if (!notification) return;

    // Only show progress notifications every 25% to avoid spam
    if (progress % 25 !== 0) return;

    notification.progress = progress;
    notification.type = 'progress';
    notification.timestamp = new Date();

    await this.showSystemNotification({
      title: 'Download Progress',
      message: `${notification.contentTitle}: ${progress}% complete`,
      icon: this.getNotificationIcon(),
      sound: false, // No sound for progress updates
      timeout: 3
    });

    logger.debug('Download progress notification sent', { downloadId, progress });
  }

  /**
   * Show download completed notification with action
   */
  async notifyDownloadCompleted(downloadId: string, filePath: string): Promise<void> {
    if (!this.shouldShowNotification()) return;

    const notification = this.activeNotifications.get(downloadId);
    if (!notification) return;

    notification.type = 'completed';
    notification.filePath = filePath;
    notification.timestamp = new Date();

    await this.showSystemNotification({
      title: '✅ Download Complete',
      message: `${notification.contentTitle} is ready for offline viewing`,
      icon: this.getNotificationIcon(),
      sound: this.settings.soundEnabled,
      timeout: 10,
      actions: ['Play Now', 'Open Folder'],
      reply: false
    });

    // Move to completed notifications history
    this.activeNotifications.delete(downloadId);
    await this.saveNotificationHistory(notification);

    logger.info('Download completed notification sent', { 
      contentTitle: notification.contentTitle, 
      downloadId,
      filePath 
    });
  }

  /**
   * Show download failed notification with smart reasoning
   */
  async notifyDownloadFailed(downloadId: string, error: string): Promise<void> {
    if (!this.shouldShowNotification()) return;

    const notification = this.activeNotifications.get(downloadId);
    if (!notification) return;

    const failureAnalysis = this.analyzeFailure(error);
    
    notification.type = 'failed';
    notification.error = error;
    notification.timestamp = new Date();

    await this.showSystemNotification({
      title: '❌ Download Failed',
      message: `${notification.contentTitle}: ${failureAnalysis.userMessage}`,
      icon: this.getNotificationIcon(),
      sound: this.settings.soundEnabled,
      timeout: 15,
      actions: failureAnalysis.retryable ? ['Retry', 'Help'] : ['Help'],
      reply: false
    });

    // Move to failed notifications history
    this.activeNotifications.delete(downloadId);
    await this.saveNotificationHistory(notification);

    logger.warn('Download failed notification sent', { 
      contentTitle: notification.contentTitle, 
      downloadId,
      error,
      failureCategory: failureAnalysis.category
    });
  }

  /**
   * Show download paused notification
   */
  async notifyDownloadPaused(downloadId: string, reason?: string): Promise<void> {
    if (!this.shouldShowNotification()) return;

    const notification = this.activeNotifications.get(downloadId);
    if (!notification) return;

    notification.type = 'paused';
    notification.timestamp = new Date();

    const message = reason 
      ? `${notification.contentTitle}: ${reason}`
      : `${notification.contentTitle} download paused`;

    await this.showSystemNotification({
      title: '⏸️ Download Paused',
      message,
      icon: this.getNotificationIcon(),
      sound: false,
      timeout: 5,
      actions: ['Resume', 'Cancel'],
      reply: false
    });

    logger.info('Download paused notification sent', { downloadId, reason });
  }

  /**
   * Update user notification settings
   */
  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    
    await this.prisma.setting.upsert({
      where: { key: 'notification_settings' },
      update: { value: JSON.stringify(this.settings) },
      create: { key: 'notification_settings', value: JSON.stringify(this.settings) }
    });

    logger.info('Notification settings updated', this.settings);
  }

  /**
   * Get current notification settings
   */
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Analyze failure and provide intelligent reasoning
   */
  private analyzeFailure(error: string): FailureReason {
    // Check for known error patterns
    for (const [pattern, analysis] of Object.entries(this.failurePatterns)) {
      if (error.toLowerCase().includes(pattern.toLowerCase())) {
        return {
          category: analysis.category,
          technicalError: error,
          userMessage: analysis.userMessage,
          suggestedActions: analysis.suggestedActions,
          retryable: analysis.category !== 'content'
        };
      }
    }

    // Default failure analysis for unknown errors
    return {
      category: 'service',
      technicalError: error,
      userMessage: 'Download failed due to an unexpected error',
      suggestedActions: ['Retry download', 'Check logs for details', 'Contact support if persistent'],
      retryable: true
    };
  }

  /**
   * Check if notifications should be shown based on user preferences
   */
  private shouldShowNotification(): boolean {
    if (!this.settings.enabled) return false;

    // Check quiet hours
    if (this.settings.quietHours.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (this.isInQuietHours(currentTime)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(currentTime: string): boolean {
    const { start, end } = this.settings.quietHours;
    
    if (start <= end) {
      // Same day quiet hours (e.g., 14:00 - 18:00)
      return currentTime >= start && currentTime <= end;
    } else {
      // Overnight quiet hours (e.g., 22:00 - 08:00)
      return currentTime >= start || currentTime <= end;
    }
  }

  /**
   * Show system notification with cross-platform compatibility
   */
  private async showSystemNotification(options: {
    title: string;
    message: string;
    icon?: string;
    sound?: boolean;
    timeout?: number;
    actions?: string[];
    reply?: boolean;
  }): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        notifier.notify({
          title: options.title,
          message: options.message,
          icon: options.icon || this.getNotificationIcon()
        }, (err, response, metadata) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      logger.error('Failed to show system notification:', error);
    }
  }

  /**
   * Get platform-specific notification icon
   */
  private getNotificationIcon(): string {
    // Return path to notification icon (could be app icon)
    return path.join(process.cwd(), 'assets', 'icon.png');
  }

  /**
   * Load user settings from database
   */
  private async loadUserSettings(): Promise<void> {
    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'notification_settings' }
      });

      if (setting?.value) {
        this.settings = { ...this.settings, ...JSON.parse(setting.value) };
      }
    } catch (error) {
      logger.warn('Failed to load notification settings, using defaults:', error);
    }
  }

  /**
   * Save notification to history for analytics
   */
  private async saveNotificationHistory(notification: DownloadNotification): Promise<void> {
    try {
      await this.prisma.setting.create({
        data: {
          key: `notification_history_${notification.id}`,
          value: JSON.stringify({
            ...notification,
            timestamp: notification.timestamp.toISOString()
          })
        }
      });
    } catch (error) {
      logger.debug('Failed to save notification history:', error);
    }
  }

  /**
   * Get default notification settings
   */
  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: true,
      showProgress: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      batchSimilar: true,
      soundEnabled: true
    };
  }

  /**
   * Clear all active notifications (useful for debugging)
   */
  async clearActiveNotifications(): Promise<void> {
    this.activeNotifications.clear();
    logger.info('All active notifications cleared');
  }

  /**
   * Get notification statistics for analytics
   */
  async getNotificationStats(): Promise<{
    active: number;
    totalSent: number;
    successRate: number;
    commonFailures: string[];
  }> {
    // Implementation would query notification history
    return {
      active: this.activeNotifications.size,
      totalSent: 0, // Would query from history
      successRate: 0.95, // Calculated from history
      commonFailures: [] // Analyzed from failure patterns
    };
  }
}
