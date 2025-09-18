/**
 * File Storage and Serving
 * 
 * Handles local file storage, organization, and serving for Offlinio
 */

import os from 'os';
import path from 'path';
import express from 'express';
import fs from 'fs-extra';
import mime from 'mime-types';
import { logger } from './utils/logger.js';

/**
 * Get the root storage directory for downloads
 */
export async function getStorageRoot(): Promise<string> {
  const envDir = process.env.DATA_DIR;
  if (envDir) {
    await fs.ensureDir(envDir);
    return envDir;
  }

  // Default user video folder per OS
  const home = os.homedir();
  let defaultDir: string;

  if (process.platform === 'win32') {
    defaultDir = path.join(home, 'Videos', 'Offlinio');
  } else if (process.platform === 'darwin') {
    defaultDir = path.join(home, 'Movies', 'Offlinio');
  } else {
    defaultDir = path.join(home, 'Videos', 'Offlinio');
  }

  await fs.ensureDir(defaultDir);
  logger.info(`Using storage directory: ${defaultDir}`);
  return defaultDir;
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(str: string): string {
  return str
    .replace(/[<>:"/\\|?*\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200); // Limit length
}

/**
 * Get file extension from URL
 */
function getExtensionFromUrl(url?: string): string {
  if (!url) return '.mp4';
  
  const match = url.match(/\.(mkv|mp4|avi|mov|mpg|m4v|webm|flv)(\?|$)/i);
  return match ? `.${match[1].toLowerCase()}` : '.mp4';
}

/**
 * Generate file path for a movie
 */
export function getMovieFilePath(title: string, year?: number, sourceUrl?: string): string {
  const ext = getExtensionFromUrl(sourceUrl);
  const sanitizedTitle = sanitizeFilename(title);
  const yearSuffix = year ? ` (${year})` : '';
  
  return path.join('Movies', `${sanitizedTitle}${yearSuffix}${ext}`);
}

/**
 * Generate file path for a TV episode
 */
export function getEpisodeFilePath(
  seriesTitle: string,
  season: number,
  episode: number,
  episodeTitle?: string,
  sourceUrl?: string
): string {
  const ext = getExtensionFromUrl(sourceUrl);
  const sanitizedSeries = sanitizeFilename(seriesTitle);
  const seasonPadded = String(season).padStart(2, '0');
  const episodePadded = String(episode).padStart(2, '0');
  const episodeSuffix = episodeTitle ? ` - ${sanitizeFilename(episodeTitle)}` : '';
  
  return path.join(
    'Series',
    sanitizedSeries,
    `Season ${season}`,
    `${sanitizedSeries} S${seasonPadded}E${episodePadded}${episodeSuffix}${ext}`
  );
}

/**
 * Check if file exists in storage
 */
export async function fileExists(relativePath: string): Promise<boolean> {
  try {
    const storageRoot = await getStorageRoot();
    const fullPath = path.join(storageRoot, relativePath);
    return await fs.pathExists(fullPath);
  } catch (error) {
    logger.error('Error checking file existence:', error);
    return false;
  }
}

/**
 * Get file stats
 */
export async function getFileStats(relativePath: string): Promise<fs.Stats | null> {
  try {
    const storageRoot = await getStorageRoot();
    const fullPath = path.join(storageRoot, relativePath);
    return await fs.stat(fullPath);
  } catch (error) {
    logger.debug('File stats not available:', { relativePath });
    return null;
  }
}

/**
 * Delete file from storage
 */
export async function deleteFile(relativePath: string): Promise<boolean> {
  try {
    const storageRoot = await getStorageRoot();
    const fullPath = path.join(storageRoot, relativePath);
    
    if (await fs.pathExists(fullPath)) {
      await fs.remove(fullPath);
      logger.info('File deleted', { relativePath });
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Failed to delete file:', error);
    return false;
  }
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  totalFiles: number;
  totalSizeBytes: number;
  movieCount: number;
  seriesCount: number;
}> {
  try {
    const storageRoot = await getStorageRoot();
    let totalFiles = 0;
    let totalSizeBytes = 0;
    let movieCount = 0;
    let seriesCount = 0;

    // Check Movies directory
    const moviesDir = path.join(storageRoot, 'Movies');
    if (await fs.pathExists(moviesDir)) {
      const movieFiles = await fs.readdir(moviesDir);
      for (const file of movieFiles) {
        const filePath = path.join(moviesDir, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          totalFiles++;
          movieCount++;
          totalSizeBytes += stats.size;
        }
      }
    }

    // Check Series directory
    const seriesDir = path.join(storageRoot, 'Series');
    if (await fs.pathExists(seriesDir)) {
      const seriesNames = await fs.readdir(seriesDir);
      for (const seriesName of seriesNames) {
        const seriesPath = path.join(seriesDir, seriesName);
        const seriesStats = await fs.stat(seriesPath);
        if (seriesStats.isDirectory()) {
          // Count episodes in all seasons
          const seasons = await fs.readdir(seriesPath);
          for (const season of seasons) {
            const seasonPath = path.join(seriesPath, season);
            const seasonStats = await fs.stat(seasonPath);
            if (seasonStats.isDirectory()) {
              const episodes = await fs.readdir(seasonPath);
              for (const episode of episodes) {
                const episodePath = path.join(seasonPath, episode);
                const episodeStats = await fs.stat(episodePath);
                if (episodeStats.isFile()) {
                  totalFiles++;
                  seriesCount++;
                  totalSizeBytes += episodeStats.size;
                }
              }
            }
          }
        }
      }
    }

    return {
      totalFiles,
      totalSizeBytes,
      movieCount,
      seriesCount
    };
  } catch (error) {
    logger.error('Failed to get storage stats:', error);
    return {
      totalFiles: 0,
      totalSizeBytes: 0,
      movieCount: 0,
      seriesCount: 0
    };
  }
}

// Express middleware for file streaming
export const fileStreaming = express.Router();

fileStreaming.use((req, res, next) => {
  // Security: Prevent path traversal
  if (req.path.includes('..') || req.path.includes('~')) {
    return res.status(403).json({ error: 'Path traversal not allowed' });
  }
  
  next();
});

// Static file server with security and streaming support
export async function createFilesRouter() {
  const storageRoot = await getStorageRoot();
  return express.static(storageRoot, {
    dotfiles: 'deny',
    index: false,
    redirect: false,
    setHeaders: (res, filePath) => {
      // Set appropriate content type
      const contentType = mime.lookup(filePath) || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      
      // Enable range requests for video streaming
      res.setHeader('Accept-Ranges', 'bytes');
      
      // Cache headers for media files
      if (contentType.startsWith('video/') || contentType.startsWith('audio/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
      }
      
      // CORS for Stremio
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
    }
  });
}

logger.info('File storage system initialized');
logger.info(`Platform: ${process.platform}`);
