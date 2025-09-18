/**
 * Downloads Management API
 * 
 * Handles download queue, progress tracking, and file management
 */

import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import { prisma } from './db.js';
import { logger, logDownloadProgress } from './utils/logger.js';
import { TokenManager } from './services/token-manager.js';
import { RealDebridClient } from './services/real-debrid-client.js';
import { NotificationService } from './services/notification-service.js';
import { 
  getStorageRoot, 
  getMovieFilePath, 
  getEpisodeFilePath,
  getStorageStats,
  deleteFile
} from './files.js';

export const downloadsRouter = express.Router();

// Initialize services for enhanced download capabilities
const tokenManager = new TokenManager(prisma);
let realDebridClient: RealDebridClient | null = null;
const notificationService = new NotificationService(prisma);

// Initialize Real-Debrid client if token is available
async function initializeRealDebridClient(): Promise<void> {
  try {
    const token = await tokenManager.getToken();
    if (token) {
      realDebridClient = new RealDebridClient(token);
      logger.info('Real-Debrid client initialized successfully');
    } else {
      logger.debug('No Real-Debrid token found - direct downloads only');
    }
  } catch (error) {
    logger.warn('Failed to initialize Real-Debrid client:', error);
  }
}

// Initialize services
notificationService.initialize().catch(error => {
  logger.warn('Failed to initialize notification service:', error);
});

initializeRealDebridClient().catch(error => {
  logger.warn('Failed to initialize Real-Debrid client:', error);
});

// Create a download job from a direct URL
downloadsRouter.post('/', async (req, res) => {
  try {
    const {
      contentId,
      type,
      title,
      year,
      seriesId,
      season,
      episode,
      directUrl,
      quality,
      posterUrl,
      description,
      genre
    } = req.body;

    // Validate required fields
    if (!directUrl || !contentId || !type || !title) {
      return res.status(400).json({
        error: 'Missing required fields: directUrl, contentId, type, title'
      });
    }

    // Validate content type
    if (!['movie', 'series'].includes(type)) {
      return res.status(400).json({
        error: 'Content type must be movie or series'
      });
    }

    // Generate file path
    const storageRoot = await getStorageRoot();
    let relativePath: string;

    if (type === 'movie') {
      relativePath = getMovieFilePath(title, year, directUrl);
    } else {
      if (!season || !episode) {
        return res.status(400).json({
          error: 'Season and episode are required for series content'
        });
      }
      relativePath = getEpisodeFilePath(title, season, episode, undefined, directUrl);
    }

    const absolutePath = path.join(storageRoot, relativePath);

    // Ensure directory exists
    await fs.ensureDir(path.dirname(absolutePath));

    // Check if already exists
    const existingContent = await prisma.content.findUnique({
      where: { id: contentId }
    });

    if (existingContent && existingContent.status === 'completed') {
      return res.status(409).json({
        error: 'Content already downloaded',
        filePath: existingContent.filePath
      });
    }

    // Create or update content record
    await prisma.content.upsert({
      where: { id: contentId },
      create: {
        id: contentId,
        type,
        title,
        year,
        status: 'downloading',
        quality,
        filePath: relativePath,
        seriesId,
        season,
        episode,
        posterUrl,
        description,
        genre
      },
      update: {
        status: 'downloading',
        filePath: relativePath,
        quality,
        posterUrl,
        description,
        genre
      }
    });

    // Create download job
    const downloadJob = await prisma.download.create({
      data: {
        contentId,
        sourceUrl: directUrl,
        downloadType: 'http',
        status: 'queued'
      }
    });

    // Send start notification
    try {
      await notificationService.notifyDownloadStarted(title, type, downloadJob.id);
    } catch (error) {
      logger.warn('Failed to send download start notification:', error);
    }

    // Start download asynchronously
    downloadFile(downloadJob.id, directUrl, absolutePath, contentId)
      .catch(async (error) => {
        logger.error('Download failed:', error);
        try {
          await notificationService.notifyDownloadFailed(
            downloadJob.id, 
            error.message || 'Unknown error'
          );
        } catch (notifError) {
          logger.warn('Failed to send download failure notification:', notifError);
        }
      });

    logger.info('Download queued', {
      contentId: contentId.substring(0, 8) + '...',
      type,
      title: title.substring(0, 20) + '...'
    });

    res.json({
      success: true,
      downloadId: downloadJob.id,
      contentId,
      filePath: relativePath,
      status: 'queued'
    });

  } catch (error) {
    logger.error('Failed to create download:', error);
    res.status(500).json({ error: 'Failed to create download' });
  }
});

// Create download from magnet link (Real-Debrid integration)
downloadsRouter.post('/magnet', async (req, res) => {
  try {
    const {
      contentId,
      type,
      title,
      year,
      seriesId,
      season,
      episode,
      magnetUri,
      quality,
      posterUrl,
      description,
      genre
    } = req.body;

    // Validate required fields
    if (!magnetUri || !contentId || !type || !title) {
      return res.status(400).json({
        error: 'Missing required fields: magnetUri, contentId, type, title'
      });
    }

    // Check if Real-Debrid client is available
    if (!realDebridClient) {
      return res.status(503).json({
        error: 'Real-Debrid integration not available. Please configure your Real-Debrid token.',
        setupRequired: true
      });
    }

    // Validate content type
    if (!['movie', 'series'].includes(type)) {
      return res.status(400).json({
        error: 'Content type must be movie or series'
      });
    }

    // Check if already exists and completed
    const existingContent = await prisma.content.findUnique({
      where: { id: contentId }
    });

    if (existingContent && existingContent.status === 'completed') {
      return res.json({
        success: true,
        message: 'Content already downloaded',
        filePath: existingContent.filePath
      });
    }

    // Create download job for magnet processing
    const downloadJob = await prisma.download.create({
      data: {
        contentId,
        sourceUrl: magnetUri,
        downloadType: 'magnet',
        status: 'processing'
      }
    });

    logger.info('Processing magnet link via Real-Debrid', {
      contentId: contentId.substring(0, 8) + '...',
      type,
      title: title.substring(0, 20) + '...'
    });

    // Send start notification
    try {
      await notificationService.notifyDownloadStarted(title, type, downloadJob.id);
    } catch (error) {
      logger.warn('Failed to send download start notification:', error);
    }

    // Process magnet link asynchronously
    processMagnetDownload(downloadJob.id, magnetUri, contentId, {
      type, title, year, seriesId, season, episode, quality, posterUrl, description, genre
    }).catch(async (error) => {
      logger.error('Magnet processing failed:', error);
      try {
        await notificationService.notifyDownloadFailed(
          downloadJob.id, 
          error.message || 'Magnet processing failed'
        );
      } catch (notifError) {
        logger.warn('Failed to send download failure notification:', notifError);
      }
    });

    res.json({
      success: true,
      downloadId: downloadJob.id,
      contentId,
      status: 'processing',
      message: 'Magnet link processing started via Real-Debrid'
    });

  } catch (error) {
    logger.error('Failed to process magnet download:', error);
    res.status(500).json({ error: 'Failed to process magnet download' });
  }
});

// Get downloads list
downloadsRouter.get('/', async (req, res) => {
  try {
    const { status, type, limit = '50', offset = '0' } = req.query;

    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;

    const content = await prisma.content.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      include: {
        downloads: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const items = content.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      year: item.year,
      season: item.season,
      episode: item.episode,
      status: item.status,
      progress: item.progress,
      quality: item.quality,
      filePath: item.filePath,
      fileSize: item.fileSize ? Number(item.fileSize) : null,
      posterUrl: item.posterUrl,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      download: item.downloads[0] ? {
        id: item.downloads[0].id,
        progress: item.downloads[0].progress,
        speedBps: item.downloads[0].speedBps ? Number(item.downloads[0].speedBps) : null,
        etaSeconds: item.downloads[0].etaSeconds,
        status: item.downloads[0].status,
        errorMessage: item.downloads[0].errorMessage
      } : null
    }));

    res.json({ items, total: items.length });
  } catch (error) {
    logger.error('Failed to get downloads:', error);
    res.status(500).json({ error: 'Failed to retrieve downloads' });
  }
});

// Get specific download
downloadsRouter.get('/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;

    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: {
        downloads: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json({
      ...content,
      fileSize: content.fileSize ? Number(content.fileSize) : null,
      downloads: content.downloads.map(d => ({
        ...d,
        speedBps: d.speedBps ? Number(d.speedBps) : null
      }))
    });
  } catch (error) {
    logger.error('Failed to get download:', error);
    res.status(500).json({ error: 'Failed to retrieve download' });
  }
});

// Delete download and file
downloadsRouter.delete('/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;

    const content = await prisma.content.findUnique({
      where: { id: contentId }
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Delete file if it exists
    if (content.filePath) {
      await deleteFile(content.filePath);
    }

    // Delete from database
    await prisma.download.deleteMany({
      where: { contentId }
    });

    await prisma.content.delete({
      where: { id: contentId }
    });

    logger.info('Download deleted', {
      contentId: contentId.substring(0, 8) + '...'
    });

    res.json({ success: true, message: 'Download deleted' });
  } catch (error) {
    logger.error('Failed to delete download:', error);
    res.status(500).json({ error: 'Failed to delete download' });
  }
});

// Pause/resume download
downloadsRouter.patch('/:contentId/status', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { status } = req.body;

    if (!['paused', 'downloading'].includes(status)) {
      return res.status(400).json({
        error: 'Status must be paused or downloading'
      });
    }

    await prisma.content.update({
      where: { id: contentId },
      data: { status }
    });

    await prisma.download.updateMany({
      where: { contentId },
      data: { status }
    });

    res.json({ success: true, status });
  } catch (error) {
    logger.error('Failed to update download status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Get storage statistics
downloadsRouter.get('/stats/storage', async (req, res) => {
  try {
    const stats = await getStorageStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get storage stats:', error);
    res.status(500).json({ error: 'Failed to get storage statistics' });
  }
});

// Get available debrid services status
downloadsRouter.get('/services/status', async (req, res) => {
  try {
    const { AutoDebridDetector } = await import('./services/auto-debrid.js');
    const detector = new AutoDebridDetector();
    
    const services = await detector.detectAvailableServices();
    const available = services.filter(s => s.detected);
    
    res.json({
      totalServices: services.length,
      availableServices: available.length,
      services: services,
      autoDetectionEnabled: true
    });
  } catch (error) {
    logger.error('Failed to get services status:', error);
    res.status(500).json({ error: 'Failed to check service status' });
  }
});

/**
 * Download file with progress tracking
 */
async function downloadFile(
  downloadId: string,
  url: string,
  destination: string,
  contentId: string
): Promise<void> {
  let lastProgressUpdate = 0;

  try {
    // Update status to downloading
    await prisma.download.update({
      where: { id: downloadId },
      data: { 
        status: 'downloading',
        startedAt: new Date()
      }
    });

    await prisma.content.update({
      where: { id: contentId },
      data: { status: 'downloading' }
    });

    // Start download
    const response = await fetch(url);
    
    if (!response.ok || !response.body) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const totalSize = Number(response.headers.get('content-length') || 0);
    let downloadedSize = 0;
    const startTime = Date.now();

    // Create write stream with optimized buffer size for better performance
    const writeStream = fs.createWriteStream(destination, {
      highWaterMark: 1024 * 1024 // 1MB buffer for better throughput
    });

    // Track progress with optimized batching
    response.body.on('data', async (chunk: Buffer) => {
      downloadedSize += chunk.length;
      const progress = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0;

      // Update progress every 10% or every 10 seconds for better performance
      const now = Date.now();
      const progressDiff = progress - lastProgressUpdate;
      const timeDiff = now - lastProgressUpdate;
      
      if (progressDiff >= 10 || timeDiff > 10000 || progress === 100) {
        // Calculate speed metrics
        const elapsedSeconds = (now - startTime) / 1000;
        const speedBps = elapsedSeconds > 0 ? Math.round(downloadedSize / elapsedSeconds) : 0;
        const remainingBytes = totalSize - downloadedSize;
        const etaSeconds = speedBps > 0 ? Math.round(remainingBytes / speedBps) : null;

        // Send progress notification every 25% for user feedback
        if (progress > 0 && (progress % 25 === 0 || progress === 100) && progress !== lastProgressUpdate) {
          try {
            await notificationService.notifyDownloadProgress(downloadId, progress);
          } catch (error) {
            logger.warn('Failed to send progress notification:', error);
          }
        }

        // Batch database updates to reduce I/O
        try {
          await Promise.all([
            prisma.download.update({
              where: { id: downloadId },
              data: {
                progress,
                speedBps: BigInt(speedBps),
                etaSeconds
              }
            }),
            prisma.content.update({
              where: { id: contentId },
              data: { 
                progress
              }
            })
          ]);

          logDownloadProgress(contentId, progress);
          lastProgressUpdate = progress;
        } catch (dbError) {
          logger.warn('Failed to update download progress in database:', dbError);
        }
      }
    });

    // Handle completion
    await new Promise<void>((resolve, reject) => {
      if (!response.body) {
        reject(new Error('No response body'));
        return;
      }
      
      response.body.pipe(writeStream);
      
      response.body.on('error', reject);
      writeStream.on('error', reject);
      
      writeStream.on('finish', async () => {
        try {
          const stats = await fs.stat(destination);
          
          await prisma.download.update({
            where: { id: downloadId },
            data: {
              status: 'completed',
              progress: 100,
              completedAt: new Date()
            }
          });

          await prisma.content.update({
            where: { id: contentId },
            data: {
              status: 'completed',
              progress: 100,
              fileSize: BigInt(stats.size)
            }
          });

          // Send completion notification
          try {
            const content = await prisma.content.findUnique({
              where: { id: contentId },
              select: { title: true }
            });
            await notificationService.notifyDownloadCompleted(
              downloadId, 
              content?.title || 'Unknown'
            );
          } catch (error) {
            logger.warn('Failed to send completion notification:', error);
          }

          logger.info('Download completed', {
            contentId: contentId.substring(0, 8) + '...',
            fileSize: stats.size
          });

          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

  } catch (error: any) {
    logger.error('Download error:', error);

    // Update status to failed
    await prisma.download.update({
      where: { id: downloadId },
      data: {
        status: 'failed',
        errorMessage: error.message
      }
    });

    await prisma.content.update({
      where: { id: contentId },
      data: {
        status: 'failed'
      }
    });

    // Enhanced cleanup and retry logic
    try {
      // Check if partial file exists and is substantial (>1MB)
      const stats = await fs.stat(destination).catch(() => null);
      if (stats && stats.size > 1024 * 1024) {
        // Keep partial file for potential resume (future enhancement)
        logger.info('Keeping partial file for potential resume:', {
          size: stats.size,
          path: destination.substring(destination.lastIndexOf('/') + 1)
        });
      } else {
        // Remove small or empty partial files
        await fs.remove(destination);
        logger.debug('Cleaned up partial file');
      }
    } catch (cleanupError) {
      logger.error('Failed to clean up partial file:', cleanupError);
    }

    throw error;
  }
}

/**
 * Process magnet download through Real-Debrid
 */
async function processMagnetDownload(
  downloadId: string,
  magnetUri: string,
  contentId: string,
  metadata: {
    type: string;
    title: string;
    year?: number;
    seriesId?: string;
    season?: number;
    episode?: number;
    quality?: string;
    posterUrl?: string;
    description?: string;
    genre?: string;
  }
): Promise<void> {
  try {
    if (!realDebridClient) {
      throw new Error('Real-Debrid client not initialized');
    }

    // Update download status to processing
    await prisma.download.update({
      where: { id: downloadId },
      data: {
        status: 'processing',
        progress: 10
      }
    });

    logger.info('Processing magnet through Real-Debrid API', {
      downloadId: downloadId.substring(0, 8) + '...',
      title: metadata.title.substring(0, 20) + '...'
    });

    // Process magnet link to get direct download URL
    const result = await realDebridClient.processMagnetToDirectUrl(magnetUri);

    if (!result.success || !result.downloadUrl) {
      throw new Error(result.error || 'Failed to process magnet link');
    }

    logger.info('Magnet processed successfully', {
      filename: result.filename,
      filesize: result.filesize
    });

    // Update progress
    await prisma.download.update({
      where: { id: downloadId },
      data: {
        status: 'queued',
        progress: 30
      }
    });

    // Generate file path for download
    const storageRoot = await getStorageRoot();
    let relativePath: string;

    if (metadata.type === 'movie') {
      relativePath = getMovieFilePath(metadata.title, metadata.year, result.downloadUrl);
    } else {
      if (!metadata.season || !metadata.episode) {
        throw new Error('Season and episode are required for series content');
      }
      relativePath = getEpisodeFilePath(
        metadata.title, 
        metadata.season, 
        metadata.episode, 
        undefined, 
        result.downloadUrl
      );
    }

    const absolutePath = path.join(storageRoot, relativePath);
    await fs.ensureDir(path.dirname(absolutePath));

    // Create or update content record
    await prisma.content.upsert({
      where: { id: contentId },
      create: {
        id: contentId,
        type: metadata.type,
        title: metadata.title,
        year: metadata.year,
        status: 'downloading',
        quality: metadata.quality,
        filePath: relativePath,
        seriesId: metadata.seriesId,
        season: metadata.season,
        episode: metadata.episode,
        posterUrl: metadata.posterUrl,
        description: metadata.description,
        genre: metadata.genre
      },
      update: {
        status: 'downloading',
        filePath: relativePath,
        quality: metadata.quality,
        posterUrl: metadata.posterUrl,
        description: metadata.description,
        genre: metadata.genre
      }
    });

    // Start actual file download
    await downloadFile(downloadId, result.downloadUrl, absolutePath, contentId);

  } catch (error: any) {
    logger.error('Magnet processing error:', error);

    await prisma.download.update({
      where: { id: downloadId },
      data: {
        status: 'failed',
        errorMessage: error.message
      }
    });

    await prisma.content.update({
      where: { id: contentId },
      data: { status: 'failed' }
    });

    throw error;
  }
}
