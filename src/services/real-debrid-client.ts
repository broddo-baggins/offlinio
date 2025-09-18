/**
 * Real-Debrid API Client
 * 
 * Handles all Real-Debrid API interactions:
 * - User authentication and API key validation
 * - Magnet link processing and torrent management
 * - File selection and direct link generation
 * - Account status and restrictions checking
 */

import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

export interface RealDebridUser {
  id: number;
  username: string;
  email: string;
  points: number;
  locale: string;
  avatar: string;
  type: string;
  premium: number;
  expiration: string;
}

export interface RealDebridTorrent {
  id: string;
  filename: string;
  original_filename: string;
  hash: string;
  bytes: number;
  original_bytes: number;
  host: string;
  split: number;
  progress: number;
  status: 'magnet_error' | 'magnet_conversion' | 'waiting_files_selection' | 'queued' | 'downloading' | 'downloaded' | 'error' | 'virus' | 'compressing' | 'uploading' | 'dead';
  added: string;
  files: RealDebridFile[];
  links: string[];
  ended?: string;
  speed?: number;
  seeders?: number;
}

export interface RealDebridFile {
  id: number;
  path: string;
  bytes: number;
  selected: number;
}

export interface RealDebridUnrestrictedLink {
  id: string;
  filename: string;
  mimeType: string;
  filesize: number;
  link: string;
  host: string;
  host_icon: string;
  chunks: number;
  crc: number;
  download: string;
  streamable: number;
}

export interface AddMagnetResult {
  success: boolean;
  torrentId?: string;
  error?: string;
  requiresFileSelection?: boolean;
  availableFiles?: RealDebridFile[];
}

export interface ProcessMagnetResult {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  filesize?: number;
  torrentId?: string;
  error?: string;
}

export class RealDebridClient {
  private apiKey: string;
  private baseUrl = 'https://api.real-debrid.com/rest/1.0';
  private userAgent = 'Offlinio/0.1.0';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Test API key and get user information
   */
  async authenticate(): Promise<{ valid: boolean; user?: RealDebridUser; error?: string }> {
    try {
      const response = await this.makeRequest('/user');
      
      if (response.ok) {
        const user = await response.json() as RealDebridUser;
        logger.info('Real-Debrid authentication successful', {
          username: user.username,
          type: user.type,
          premium: user.premium,
          expiration: user.expiration
        });
        
        return { valid: true, user };
      } else {
        const error = await response.text();
        logger.error('Real-Debrid authentication failed:', error);
        return { valid: false, error: `Authentication failed: ${response.status}` };
      }
    } catch (error: any) {
      logger.error('Real-Debrid authentication error:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Add magnet link to Real-Debrid
   */
  async addMagnet(magnetUri: string): Promise<AddMagnetResult> {
    try {
      logger.info('Adding magnet to Real-Debrid');
      
      const response = await this.makeRequest('/torrents/addMagnet', {
        method: 'POST',
        body: new URLSearchParams({
          magnet: magnetUri
        })
      });

      if (response.ok) {
        const result = await response.json() as { id: string; uri: string };
        const torrentId = result.id;
        
        logger.info('Magnet added successfully', { torrentId });
        
        // Wait a moment for processing
        await this.sleep(2000);
        
        // Get torrent info to check if file selection is needed
        const torrentInfo = await this.getTorrentInfo(torrentId);
        
        if (torrentInfo) {
          if (torrentInfo.status === 'waiting_files_selection') {
            return {
              success: true,
              torrentId,
              requiresFileSelection: true,
              availableFiles: torrentInfo.files
            };
          } else if (torrentInfo.status === 'downloaded' || torrentInfo.links.length > 0) {
            return {
              success: true,
              torrentId,
              requiresFileSelection: false
            };
          } else {
            // Still processing, return success but indicate waiting
            return {
              success: true,
              torrentId,
              requiresFileSelection: false
            };
          }
        }
        
        return { success: true, torrentId };
      } else {
        const error = await response.text();
        logger.error('Failed to add magnet:', error);
        return { success: false, error: `Failed to add magnet: ${response.status}` };
      }
    } catch (error: any) {
      logger.error('Add magnet error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get torrent information
   */
  async getTorrentInfo(torrentId: string): Promise<RealDebridTorrent | null> {
    try {
      const response = await this.makeRequest(`/torrents/info/${torrentId}`);
      
      if (response.ok) {
        const torrent = await response.json() as RealDebridTorrent;
        return torrent;
      } else {
        logger.error(`Failed to get torrent info: ${response.status}`);
        return null;
      }
    } catch (error) {
      logger.error('Get torrent info error:', error);
      return null;
    }
  }

  /**
   * Select files from torrent (if multiple files available)
   */
  async selectFiles(torrentId: string, fileIds: number[]): Promise<boolean> {
    try {
      logger.info('Selecting files from torrent', { torrentId, fileCount: fileIds.length });
      
      const response = await this.makeRequest(`/torrents/selectFiles/${torrentId}`, {
        method: 'POST',
        body: new URLSearchParams({
          files: fileIds.join(',')
        })
      });

      if (response.ok) {
        logger.info('Files selected successfully');
        return true;
      } else {
        const error = await response.text();
        logger.error('Failed to select files:', error);
        return false;
      }
    } catch (error) {
      logger.error('Select files error:', error);
      return false;
    }
  }

  /**
   * Get direct download link from Real-Debrid link
   */
  async unrestrictLink(link: string): Promise<RealDebridUnrestrictedLink | null> {
    try {
      logger.info('Unrestricting Real-Debrid link');
      
      const response = await this.makeRequest('/unrestrict/link', {
        method: 'POST',
        body: new URLSearchParams({
          link: link
        })
      });

      if (response.ok) {
        const result = await response.json() as RealDebridUnrestrictedLink;
        logger.info('Link unrestricted successfully', {
          filename: result.filename,
          filesize: result.filesize
        });
        return result;
      } else {
        const error = await response.text();
        logger.error('Failed to unrestrict link:', error);
        return null;
      }
    } catch (error) {
      logger.error('Unrestrict link error:', error);
      return null;
    }
  }

  /**
   * Process complete magnet link to direct download URL
   * This is the main method that handles the entire flow
   */
  async processMagnetToDirectUrl(
    magnetUri: string,
    preferredFileExtensions: string[] = ['mkv', 'mp4', 'avi']
  ): Promise<ProcessMagnetResult> {
    try {
      // Step 1: Add magnet to Real-Debrid
      const addResult = await this.addMagnet(magnetUri);
      
      if (!addResult.success || !addResult.torrentId) {
        return { success: false, error: addResult.error };
      }

      const torrentId = addResult.torrentId;
      
      // Step 2: Handle file selection if needed
      if (addResult.requiresFileSelection && addResult.availableFiles) {
        const selectedFileIds = this.selectBestFiles(addResult.availableFiles, preferredFileExtensions);
        
        if (selectedFileIds.length === 0) {
          return { success: false, error: 'No suitable video files found in torrent' };
        }
        
        const selectSuccess = await this.selectFiles(torrentId, selectedFileIds);
        if (!selectSuccess) {
          return { success: false, error: 'Failed to select files' };
        }
        
        // Wait for processing
        await this.sleep(3000);
      }
      
      // Step 3: Wait for download completion and get links
      const torrentInfo = await this.waitForTorrentCompletion(torrentId);
      
      if (!torrentInfo || torrentInfo.links.length === 0) {
        return { success: false, error: 'Torrent processing failed or no links available' };
      }
      
      // Step 4: Get direct download link
      const firstLink = torrentInfo.links[0];
      const unrestrictedLink = await this.unrestrictLink(firstLink);
      
      if (!unrestrictedLink) {
        return { success: false, error: 'Failed to get direct download link' };
      }
      
      return {
        success: true,
        downloadUrl: unrestrictedLink.download,
        filename: unrestrictedLink.filename,
        filesize: unrestrictedLink.filesize,
        torrentId
      };
      
    } catch (error: any) {
      logger.error('Process magnet error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Select best video files from available files
   */
  private selectBestFiles(files: RealDebridFile[], preferredExtensions: string[]): number[] {
    const videoFiles = files.filter(file => {
      const extension = file.path.split('.').pop()?.toLowerCase();
      return extension && preferredExtensions.includes(extension);
    });
    
    // Sort by file size (larger files are usually better quality)
    videoFiles.sort((a, b) => b.bytes - a.bytes);
    
    // Return the largest video file, or all if multiple main files
    if (videoFiles.length === 1) {
      return [videoFiles[0].id];
    } else if (videoFiles.length > 1) {
      // If multiple files, take the largest one
      return [videoFiles[0].id];
    }
    
    return [];
  }

  /**
   * Wait for torrent to complete processing
   */
  private async waitForTorrentCompletion(torrentId: string, maxWaitMinutes: number = 10): Promise<RealDebridTorrent | null> {
    const maxAttempts = maxWaitMinutes * 4; // Check every 15 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const torrentInfo = await this.getTorrentInfo(torrentId);
      
      if (!torrentInfo) {
        logger.error('Failed to get torrent info during wait');
        return null;
      }
      
      logger.debug(`Torrent status: ${torrentInfo.status} (attempt ${attempt}/${maxAttempts})`);
      
      if (torrentInfo.status === 'downloaded' && torrentInfo.links.length > 0) {
        logger.info('Torrent completed successfully');
        return torrentInfo;
      } else if (torrentInfo.status === 'error' || torrentInfo.status === 'virus' || torrentInfo.status === 'dead') {
        logger.error(`Torrent failed with status: ${torrentInfo.status}`);
        return null;
      }
      
      // Wait 15 seconds before next check
      await this.sleep(15000);
    }
    
    logger.error('Torrent completion timeout');
    return null;
  }

  /**
   * Make authenticated request to Real-Debrid API
   */
  private async makeRequest(endpoint: string, options: any = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'User-Agent': this.userAgent,
      ...options.headers
    };
    
    if (options.body instanceof URLSearchParams) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    return response;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get user account status
   */
  async getAccountStatus(): Promise<RealDebridUser | null> {
    const authResult = await this.authenticate();
    return authResult.valid ? authResult.user || null : null;
  }

  /**
   * Delete torrent from Real-Debrid
   */
  async deleteTorrent(torrentId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/torrents/delete/${torrentId}`, {
        method: 'DELETE'
      });
      
      return response.ok;
    } catch (error) {
      logger.error('Delete torrent error:', error);
      return false;
    }
  }
}
