/**
 * Legal Notice Service
 * 
 * Handles legal compliance for Offlinio:
 * - First-run legal notice display
 * - User acceptance tracking
 * - Legal notice versioning
 * - Compliance enforcement
 */

import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';

export interface LegalNoticeContent {
  version: string;
  title: string;
  message: string;
  acceptanceRequired: boolean;
  drmPolicy: string;
  acceptableUses: string[];
  prohibitedUses: string[];
}

export interface UserAcceptance {
  version: string;
  accepted: boolean;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
}

export class LegalNoticeService {
  private currentVersion: string;
  private initialized: boolean = false;

  constructor() {
    this.currentVersion = process.env.LEGAL_NOTICE_VERSION || '1.0.0';
  }

  /**
   * Initialize the legal notice service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('Initializing legal notice service');
      
      // Ensure current version is stored in settings
      await prisma.setting.upsert({
        where: { key: 'legal_notice_version' },
        update: { value: this.currentVersion },
        create: { key: 'legal_notice_version', value: this.currentVersion }
      });

      this.initialized = true;
      logger.info(`Legal notice service initialized (version: ${this.currentVersion})`);
    } catch (error) {
      logger.error('Failed to initialize legal notice service:', error);
      throw error;
    }
  }

  /**
   * Get the current legal notice content
   */
  getLegalNoticeContent(): LegalNoticeContent {
    return {
      version: this.currentVersion,
      title: '🛡️ Offlinio - Legal Use Only 🛡️',
      message: `
You must have legal rights to download any content.

This tool is designed for personal use of legally obtained content only.

By continuing, you confirm you will only download content you have legal rights to access.
      `.trim(),
      acceptanceRequired: true,
      drmPolicy: 'This tool will not access, bypass, or assist in bypassing access controls. DRM-protected content will be automatically detected and blocked.',
      acceptableUses: [
        'Personal backups of content you own',
        'Public domain materials',
        'Creative Commons licensed content',
        'Content from your authorized debrid services',
        'Your own user-generated content',
        'Enterprise internal media'
      ],
      prohibitedUses: [
        'Bypassing DRM or access controls',
        'Downloading unauthorized copyrighted content',
        'Indexing or cataloging content sources',
        'Distributing copyrighted material'
      ]
    };
  }

  /**
   * Check if user has accepted the latest legal notice
   */
  async hasUserAcceptedLatest(): Promise<boolean> {
    try {
      const latestAcceptance = await prisma.legalAcceptance.findFirst({
        where: {
          version: this.currentVersion,
          accepted: true
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      return latestAcceptance !== null;
    } catch (error) {
      logger.error('Failed to check legal acceptance:', error);
      return false;
    }
  }

  /**
   * Record user acceptance of legal notice
   */
  async recordUserAcceptance(
    accepted: boolean,
    userAgent?: string,
    ipAddress?: string
  ): Promise<UserAcceptance> {
    try {
      const acceptance = await prisma.legalAcceptance.create({
        data: {
          version: this.currentVersion,
          accepted,
          userAgent,
          ipAddress: ipAddress ? this.hashIP(ipAddress) : undefined // Hash IP for privacy
        }
      });

      logger.info('Legal acceptance recorded', {
        version: this.currentVersion,
        accepted,
        hasUserAgent: !!userAgent
      });

      return {
        version: acceptance.version,
        accepted: acceptance.accepted,
        timestamp: acceptance.timestamp,
        userAgent: acceptance.userAgent || undefined,
        ipAddress: acceptance.ipAddress || undefined
      };
    } catch (error) {
      logger.error('Failed to record legal acceptance:', error);
      throw error;
    }
  }

  /**
   * Get user's acceptance history
   */
  async getUserAcceptanceHistory(): Promise<UserAcceptance[]> {
    try {
      const acceptances = await prisma.legalAcceptance.findMany({
        orderBy: {
          timestamp: 'desc'
        },
        take: 10 // Last 10 acceptances
      });

      return acceptances.map(a => ({
        version: a.version,
        accepted: a.accepted,
        timestamp: a.timestamp,
        userAgent: a.userAgent || undefined,
        ipAddress: a.ipAddress || undefined
      }));
    } catch (error) {
      logger.error('Failed to get acceptance history:', error);
      return [];
    }
  }

  /**
   * Check if legal notice needs to be shown
   */
  async shouldShowLegalNotice(): Promise<boolean> {
    // Always require acceptance if REQUIRE_LEGAL_ACCEPTANCE is true
    if (process.env.REQUIRE_LEGAL_ACCEPTANCE === 'true') {
      return !(await this.hasUserAcceptedLatest());
    }

    // In development, might be more lenient
    if (process.env.NODE_ENV === 'development') {
      return false;
    }

    return !(await this.hasUserAcceptedLatest());
  }

  /**
   * Validate that user can access functionality
   */
  async validateUserAccess(): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const hasAccepted = await this.hasUserAcceptedLatest();
      
      if (!hasAccepted) {
        return {
          allowed: false,
          reason: 'Legal notice acceptance required'
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Failed to validate user access:', error);
      return {
        allowed: false,
        reason: 'Failed to validate legal compliance'
      };
    }
  }

  /**
   * Get legal notice for display in UI
   */
  async getLegalNoticeForDisplay(): Promise<{
    content: LegalNoticeContent;
    mustAccept: boolean;
    hasAccepted: boolean;
  }> {
    const content = this.getLegalNoticeContent();
    const hasAccepted = await this.hasUserAcceptedLatest();
    const mustAccept = await this.shouldShowLegalNotice();

    return {
      content,
      mustAccept,
      hasAccepted
    };
  }

  /**
   * Hash IP address for privacy (one-way hash)
   */
  private hashIP(ip: string): string {
    // Simple hash for privacy - in production, use crypto
    return Buffer.from(ip).toString('base64').substring(0, 10);
  }

  /**
   * Clean up old acceptance records (optional privacy measure)
   */
  async cleanupOldAcceptances(olderThanDays: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await prisma.legalAcceptance.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} old legal acceptance records`);
      }

      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup old acceptances:', error);
      return 0;
    }
  }
}
