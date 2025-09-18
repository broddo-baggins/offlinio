/**
 * Auto-Debrid Detection Service
 * 
 * Automatically detects available debrid services (Real-Debrid, AllDebrid, etc.)
 * and handles downloads without user configuration.
 */

import { logger } from '../utils/logger.js';
import { RealDebridClient } from './real-debrid-client.js';

export interface DebridService {
  name: string;
  detected: boolean;
  apiEndpoint?: string;
  userAgent?: string;
}

export interface AutoDownloadResult {
  success: boolean;
  downloadUrl?: string;
  service?: string;
  error?: string;
  isPublicDomain?: boolean;
}

export class AutoDebridDetector {
  private detectedServices: DebridService[] = [];
  private lastDetection: Date | null = null;
  private detectionCacheMs = 60000; // Cache for 1 minute
  private realDebridClient: RealDebridClient | null = null;

  constructor() {
    // Initialize known debrid services
    this.detectedServices = [
      { name: 'Real-Debrid', detected: false },
      { name: 'AllDebrid', detected: false },
      { name: 'Premiumize', detected: false },
      { name: 'DebridLink', detected: false }
    ];
    
    // Initialize Real-Debrid client if API key is available
    const rdApiKey = process.env.REAL_DEBRID_API_KEY;
    if (rdApiKey) {
      this.realDebridClient = new RealDebridClient(rdApiKey);
    }
  }

  /**
   * Auto-detect available debrid services
   */
  async detectAvailableServices(): Promise<DebridService[]> {
    // Use cache if recent
    if (this.lastDetection && Date.now() - this.lastDetection.getTime() < this.detectionCacheMs) {
      return this.detectedServices;
    }

    logger.info('Auto-detecting debrid services...');

    try {
      // Check for Real-Debrid
      await this.checkRealDebrid();
      
      // Check for AllDebrid
      await this.checkAllDebrid();
      
      // Check for Premiumize
      await this.checkPremiumize();
      
      // Check for DebridLink
      await this.checkDebridLink();

      this.lastDetection = new Date();
      
      const detectedCount = this.detectedServices.filter(s => s.detected).length;
      logger.info(`Auto-detection complete: ${detectedCount} services available`);

    } catch (error) {
      logger.error('Error during service detection:', error);
    }

    return this.detectedServices;
  }

  /**
   * Automatically resolve download for content
   */
  async autoResolveDownload(
    contentId: string,
    magnetUri?: string,
    directUrl?: string
  ): Promise<AutoDownloadResult> {
    
    // First, check if it's public domain content
    if (this.isPublicDomainContent(contentId)) {
      return await this.handlePublicDomainContent(contentId, directUrl);
    }

    // If we have a direct URL, use it directly
    if (directUrl && this.isDirectDownloadUrl(directUrl)) {
      return {
        success: true,
        downloadUrl: directUrl,
        service: 'direct',
        isPublicDomain: false
      };
    }

    // Auto-detect and use available debrid services
    const services = await this.detectAvailableServices();
    const availableServices = services.filter(s => s.detected);

    if (availableServices.length === 0) {
      return {
        success: false,
        error: 'No debrid services detected. Please ensure you have a debrid service installed and running.'
      };
    }

    // Try each service in priority order
    for (const service of availableServices) {
      try {
        const result = await this.tryResolveWithService(service, magnetUri, directUrl);
        if (result.success) {
          return result;
        }
      } catch (error) {
        logger.warn(`Failed to resolve with ${service.name}:`, error);
      }
    }

    return {
      success: false,
      error: 'Failed to resolve download with any available service'
    };
  }

  /**
   * Check if Real-Debrid is available
   */
  private async checkRealDebrid(): Promise<void> {
    try {
      const service = this.detectedServices.find(s => s.name === 'Real-Debrid');
      if (!service) return;

      service.apiEndpoint = 'https://api.real-debrid.com/rest/1.0';
      
      if (this.realDebridClient) {
        // Test actual API authentication
        const authResult = await this.realDebridClient.authenticate();
        service.detected = authResult.valid;
        
        if (service.detected && authResult.user) {
          logger.info('Real-Debrid detected and authenticated', {
            username: authResult.user.username,
            type: authResult.user.type,
            premium: authResult.user.premium
          });
        } else {
          logger.warn('Real-Debrid API key invalid or expired');
        }
      } else {
        // No API key configured
        service.detected = false;
        logger.debug('Real-Debrid not configured (no API key)');
      }
    } catch (error) {
      logger.debug('Real-Debrid detection failed:', error);
      const service = this.detectedServices.find(s => s.name === 'Real-Debrid');
      if (service) service.detected = false;
    }
  }

  /**
   * Check if AllDebrid is available
   */
  private async checkAllDebrid(): Promise<void> {
    try {
      const service = this.detectedServices.find(s => s.name === 'AllDebrid');
      if (service) {
        service.detected = this.hasAllDebridIndicators();
        service.apiEndpoint = 'https://api.alldebrid.com/v4';
        
        if (service.detected) {
          logger.debug('AllDebrid detected via browser indicators');
        }
      }
    } catch (error) {
      logger.debug('AllDebrid detection failed:', error);
    }
  }

  /**
   * Check if Premiumize is available
   */
  private async checkPremiumize(): Promise<void> {
    try {
      const service = this.detectedServices.find(s => s.name === 'Premiumize');
      if (service) {
        service.detected = this.hasPremiumizeIndicators();
        service.apiEndpoint = 'https://api.premiumize.me/pm-api/v1';
        
        if (service.detected) {
          logger.debug('Premiumize detected via browser indicators');
        }
      }
    } catch (error) {
      logger.debug('Premiumize detection failed:', error);
    }
  }

  /**
   * Check if DebridLink is available
   */
  private async checkDebridLink(): Promise<void> {
    try {
      const service = this.detectedServices.find(s => s.name === 'DebridLink');
      if (service) {
        service.detected = this.hasDebridLinkIndicators();
        service.apiEndpoint = 'https://debrid-link.fr/api';
        
        if (service.detected) {
          logger.debug('DebridLink detected via browser indicators');
        }
      }
    } catch (error) {
      logger.debug('DebridLink detection failed:', error);
    }
  }

  /**
   * Check for Real-Debrid browser indicators
   */
  private hasRealDebridIndicators(): boolean {
    // In a real implementation, this would check for:
    // - Browser extension APIs
    // - Local storage tokens
    // - Active browser sessions
    // - System processes
    
    // For now, return true to simulate detection
    return true; // Simplified for demo
  }

  /**
   * Check for AllDebrid browser indicators
   */
  private hasAllDebridIndicators(): boolean {
    // Similar detection logic for AllDebrid
    return false; // Simplified for demo
  }

  /**
   * Check for Premiumize browser indicators
   */
  private hasPremiumizeIndicators(): boolean {
    // Similar detection logic for Premiumize
    return false; // Simplified for demo
  }

  /**
   * Check for DebridLink browser indicators
   */
  private hasDebridLinkIndicators(): boolean {
    // Similar detection logic for DebridLink
    return false; // Simplified for demo
  }

  /**
   * Check if content is public domain
   */
  private isPublicDomainContent(contentId: string): boolean {
    // Check against known public domain content databases
    // This would be expanded with actual public domain checking
    const publicDomainIndicators = [
      'archive.org',
      'publicdomain',
      'creative-commons',
      'cc-by',
      'gutenberg'
    ];
    
    return publicDomainIndicators.some(indicator => 
      contentId.toLowerCase().includes(indicator)
    );
  }

  /**
   * Handle public domain content
   */
  private async handlePublicDomainContent(
    contentId: string,
    directUrl?: string
  ): Promise<AutoDownloadResult> {
    if (directUrl) {
      return {
        success: true,
        downloadUrl: directUrl,
        service: 'public-domain',
        isPublicDomain: true
      };
    }

    // Try to resolve public domain content from known sources
    const publicDomainUrl = await this.resolvePublicDomainUrl(contentId);
    
    if (publicDomainUrl) {
      return {
        success: true,
        downloadUrl: publicDomainUrl,
        service: 'public-domain',
        isPublicDomain: true
      };
    }

    return {
      success: false,
      error: 'Public domain content not found'
    };
  }

  /**
   * Resolve public domain content URL
   */
  private async resolvePublicDomainUrl(contentId: string): Promise<string | null> {
    // This would interface with public domain content providers
    // Like Internet Archive, Wikimedia Commons, etc.
    
    // Simplified implementation
    if (contentId.includes('archive.org')) {
      return `https://archive.org/download/${contentId}`;
    }
    
    return null;
  }

  /**
   * Check if URL is a direct download
   */
  private isDirectDownloadUrl(url: string): boolean {
    const directDownloadPatterns = [
      /\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v)$/i,
      /direct-download/i,
      /cdn\./i
    ];
    
    return directDownloadPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Try to resolve download with specific service
   */
  private async tryResolveWithService(
    service: DebridService,
    magnetUri?: string,
    directUrl?: string
  ): Promise<AutoDownloadResult> {
    
    logger.info(`Attempting resolution with ${service.name}`);
    
    if (service.name === 'Real-Debrid' && this.realDebridClient) {
      // Use direct URL if available
      if (directUrl && this.isDirectDownloadUrl(directUrl)) {
        return {
          success: true,
          downloadUrl: directUrl,
          service: service.name
        };
      }
      
      // Process magnet link through Real-Debrid
      if (magnetUri) {
        try {
          const result = await this.realDebridClient.processMagnetToDirectUrl(magnetUri);
          
          if (result.success && result.downloadUrl) {
            return {
              success: true,
              downloadUrl: result.downloadUrl,
              service: service.name
            };
          } else {
            return {
              success: false,
              error: result.error || 'Real-Debrid processing failed'
            };
          }
        } catch (error: any) {
          logger.error('Real-Debrid processing error:', error);
          return {
            success: false,
            error: `Real-Debrid error: ${error.message}`
          };
        }
      }
    }
    
    // Fallback for other services (not implemented yet)
    return {
      success: false,
      error: `${service.name} resolution not implemented`
    };
  }

  /**
   * Get status of all services
   */
  getServiceStatus(): DebridService[] {
    return [...this.detectedServices];
  }

  /**
   * Force refresh service detection
   */
  async refreshDetection(): Promise<DebridService[]> {
    this.lastDetection = null;
    return await this.detectAvailableServices();
  }
}
