/**
 * Comet Integration Service
 * 
 * Integrates with the Comet addon to get the same torrent sources
 * that users see in their Stremio streams, so we can download them.
 */

import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

export interface CometStream {
  name: string;
  title: string;
  url: string;
  quality?: string;
  size?: string;
  seeders?: number;
  type?: string;
  behaviorHints?: {
    bingeGroup?: string;
    notWebReady?: boolean;
  };
}

export interface CometResponse {
  streams: CometStream[];
}

export interface ProcessedMagnet {
  magnetUri: string;
  title: string;
  quality: string;
  size?: string;
  seeders?: number;
  priority: number; // Higher = better
}

export class CometIntegration {
  private cometBaseUrl: string;
  private userAgent = 'Offlinio/0.1.0';

  constructor(cometBaseUrl = 'https://comet.elfhosted.com') {
    this.cometBaseUrl = cometBaseUrl;
  }

  /**
   * Get torrent streams for content from Comet (same as user sees)
   */
  async getStreamsForContent(
    type: 'movie' | 'series',
    imdbId: string,
    season?: number,
    episode?: number
  ): Promise<CometStream[]> {
    try {
      let endpoint: string;
      
      if (type === 'movie') {
        endpoint = `/stream/movie/${imdbId}.json`;
      } else {
        // For series, we need season and episode
        if (!season || !episode) {
          throw new Error('Season and episode required for series');
        }
        endpoint = `/stream/series/${imdbId}:${season}:${episode}.json`;
      }

      const url = `${this.cometBaseUrl}${endpoint}`;
      logger.info('Fetching streams from Comet', { 
        type, 
        imdbId: imdbId.substring(0, 10) + '...', 
        url: endpoint 
      });

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        // Note: node-fetch doesn't support timeout directly
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        logger.warn(`Comet request failed: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json() as CometResponse;
      
      if (!data.streams || !Array.isArray(data.streams)) {
        logger.warn('Invalid Comet response format');
        return [];
      }

      logger.info(`Comet returned ${data.streams.length} streams`);
      return data.streams;

    } catch (error: any) {
      logger.error('Failed to fetch streams from Comet:', error.message);
      return [];
    }
  }

  /**
   * Extract and prioritize magnet links from Comet streams
   */
  extractMagnetLinks(streams: CometStream[]): ProcessedMagnet[] {
    const magnets: ProcessedMagnet[] = [];

    for (const stream of streams) {
      // Only process magnet links
      if (!stream.url || !stream.url.startsWith('magnet:')) {
        continue;
      }

      const processed: ProcessedMagnet = {
        magnetUri: stream.url,
        title: stream.title || stream.name || 'Unknown',
        quality: this.extractQuality(stream.name || stream.title || ''),
        size: this.extractSize(stream.name || stream.title || ''),
        seeders: this.extractSeeders(stream.name || stream.title || ''),
        priority: this.calculatePriority(stream)
      };

      magnets.push(processed);
    }

    // Sort by priority (highest first)
    magnets.sort((a, b) => b.priority - a.priority);

    logger.info(`Extracted ${magnets.length} magnet links from ${streams.length} streams`);
    return magnets;
  }

  /**
   * Get best magnet link for content
   */
  async getBestMagnetForContent(
    type: 'movie' | 'series',
    imdbId: string,
    season?: number,
    episode?: number,
    preferredQuality: string[] = ['2160p', '1080p', '720p']
  ): Promise<ProcessedMagnet | null> {
    
    const streams = await this.getStreamsForContent(type, imdbId, season, episode);
    if (streams.length === 0) {
      return null;
    }

    const magnets = this.extractMagnetLinks(streams);
    if (magnets.length === 0) {
      return null;
    }

    // Try to find preferred quality
    for (const quality of preferredQuality) {
      const qualityMatch = magnets.find(m => 
        m.quality.toLowerCase().includes(quality.toLowerCase())
      );
      if (qualityMatch) {
        logger.info(`Found ${quality} magnet for content`, {
          title: qualityMatch.title,
          size: qualityMatch.size
        });
        return qualityMatch;
      }
    }

    // Return highest priority if no quality preference match
    const best = magnets[0];
    logger.info('Using highest priority magnet', {
      title: best.title,
      quality: best.quality,
      size: best.size
    });
    
    return best;
  }

  /**
   * Extract quality from stream name
   */
  private extractQuality(name: string): string {
    const qualityPatterns = [
      /2160p|4k/i,
      /1080p/i,
      /720p/i,
      /480p/i,
      /360p/i
    ];

    for (const pattern of qualityPatterns) {
      const match = name.match(pattern);
      if (match) {
        return match[0].toUpperCase();
      }
    }

    return 'Unknown';
  }

  /**
   * Extract file size from stream name
   */
  private extractSize(name: string): string | undefined {
    const sizePattern = /(\d+(?:\.\d+)?)\s?(GB|MB|TB)/i;
    const match = name.match(sizePattern);
    return match ? `${match[1]} ${match[2].toUpperCase()}` : undefined;
  }

  /**
   * Extract seeders count from stream name
   */
  private extractSeeders(name: string): number | undefined {
    const seedersPattern = /👤\s*(\d+)/;
    const match = name.match(seedersPattern);
    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Calculate priority score for a stream
   */
  private calculatePriority(stream: CometStream): number {
    let priority = 0;
    const name = (stream.name || stream.title || '').toLowerCase();

    // Quality priority
    if (name.includes('2160p') || name.includes('4k')) priority += 100;
    else if (name.includes('1080p')) priority += 80;
    else if (name.includes('720p')) priority += 60;
    else if (name.includes('480p')) priority += 40;

    // Format priority
    if (name.includes('remux')) priority += 30;
    else if (name.includes('bluray') || name.includes('blu-ray')) priority += 25;
    else if (name.includes('web-dl') || name.includes('webdl')) priority += 20;
    else if (name.includes('webrip')) priority += 15;
    else if (name.includes('hdtv')) priority += 10;

    // Codec priority
    if (name.includes('h265') || name.includes('hevc')) priority += 15;
    else if (name.includes('h264') || name.includes('avc')) priority += 10;

    // Audio priority
    if (name.includes('atmos')) priority += 10;
    else if (name.includes('dts-hd') || name.includes('truehd')) priority += 8;
    else if (name.includes('dts') || name.includes('ac3')) priority += 5;

    // Seeders bonus
    const seeders = this.extractSeeders(name);
    if (seeders) {
      priority += Math.min(seeders, 50); // Max 50 points for seeders
    }

    // Size considerations (prefer reasonable sizes)
    const size = this.extractSize(name);
    if (size) {
      const sizeMatch = size.match(/(\d+(?:\.\d+)?)/);
      if (sizeMatch) {
        const sizeNum = parseFloat(sizeMatch[1]);
        const unit = size.toUpperCase();
        
        if (unit.includes('GB')) {
          // Prefer 2-15GB for movies, 0.5-3GB for episodes
          if (sizeNum >= 2 && sizeNum <= 15) priority += 10;
          else if (sizeNum > 15) priority -= 5; // Too big
          else if (sizeNum < 1) priority -= 10; // Too small
        }
      }
    }

    return priority;
  }

  /**
   * Test connection to Comet
   */
  async testConnection(): Promise<{ available: boolean; version?: string; error?: string }> {
    try {
      const response = await fetch(`${this.cometBaseUrl}/manifest.json`, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const manifest = await response.json() as any;
        return {
          available: true,
          version: manifest.version || 'unknown'
        };
      } else {
        return {
          available: false,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error: any) {
      return {
        available: false,
        error: error.message
      };
    }
  }
}
