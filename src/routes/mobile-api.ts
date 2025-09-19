/**
 * Mobile-Friendly API Extensions for Offlinio
 * 
 * Extends the existing Offlinio server with mobile-optimized APIs:
 * - Lightweight responses for mobile clients
 * - Intent-based triggers for companion apps
 * - PWA-friendly streaming endpoints
 * - Background download management
 */

import express from 'express';
import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';
import { AutoDebridDetector } from '../services/auto-debrid.js';
import { CometIntegration } from '../services/comet-integration.js';

export const mobileApiRouter = express.Router();

// Mobile-optimized content discovery
mobileApiRouter.get('/discover/:type/:imdbId', async (req, res) => {
  try {
    const { type, imdbId } = req.params;
    const { season, episode } = req.query;

    // Get metadata from existing catalog service
    const cometIntegration = new CometIntegration();
    const autoDebrid = new AutoDebridDetector();

    // Get available download sources
    const bestMagnet = await cometIntegration.getBestMagnetForContent(
      type as 'movie' | 'series',
      imdbId,
      season ? Number(season) : undefined,
      episode ? Number(episode) : undefined
    );

    // Check if already downloaded
    const contentId = season && episode ? `${imdbId}:${season}:${episode}` : imdbId;
    const existingContent = await prisma.content.findUnique({
      where: { id: contentId }
    });

    // Get available services
    const services = await autoDebrid.detectAvailableServices();
    const availableServices = services.filter(s => s.detected);

    res.json({
      contentId,
      type,
      imdbId,
      season: season ? Number(season) : undefined,
      episode: episode ? Number(episode) : undefined,
      downloadable: !!bestMagnet,
      alreadyDownloaded: existingContent?.status === 'completed',
      downloadProgress: existingContent?.progress || 0,
      downloadStatus: existingContent?.status || 'not_started',
      magnet: bestMagnet ? {
        title: bestMagnet.title,
        quality: bestMagnet.quality,
        size: bestMagnet.size,
        magnetUri: bestMagnet.magnetUri
      } : null,
      services: availableServices.map(s => ({
        name: s.name,
        detected: s.detected,
        priority: s.priority
      })),
      // Mobile app integration URLs
      downloadUrl: bestMagnet ? 
        `http://127.0.0.1:${process.env.PORT || 11471}/mobile/download/${encodeURIComponent(contentId)}` : null,
      intentUrl: bestMagnet ?
        `offlinio://download?contentId=${encodeURIComponent(contentId)}&type=${type}&title=${encodeURIComponent(bestMagnet.title)}` : null
    });

  } catch (error) {
    logger.error('Mobile discover error:', error);
    res.status(500).json({ error: 'Failed to discover content' });
  }
});

// Trigger download with mobile-optimized response
mobileApiRouter.post('/download/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { 
      returnFormat = 'json',  // json | intent | redirect
      callbackUrl,            // For companion app callbacks
      deviceId               // For device-specific tracking
    } = req.body;

    // Use existing download trigger logic from addon
    const addon = await import('../addon.js');
    // Call the download endpoint from addon router
    const downloadResponse = await fetch(`http://127.0.0.1:${process.env.PORT || 11471}/download/${encodeURIComponent(contentId)}`, {
      method: 'GET'
    });
    
    const result = downloadResponse.ok ? await downloadResponse.json() : { 
      success: false, 
      error: 'Download trigger failed' 
    };

    // Mobile-optimized response formats
    switch (returnFormat) {
      case 'intent':
        // Return Android intent data
        res.json({
          success: result.success,
          intent: {
            action: 'com.offlinio.DOWNLOAD_STARTED',
            extras: {
              downloadId: result.downloadId,
              contentId,
              title: result.magnetTitle || 'Unknown',
              callbackUrl
            }
          },
          downloadId: result.downloadId
        });
        break;

      case 'redirect':
        // Return redirect URL for web browsers
        if (result.success) {
          res.json({
            success: true,
            redirect: `http://127.0.0.1:${process.env.PORT || 11471}/ui/`,
            downloadId: result.downloadId
          });
        } else {
          res.status(400).json({ success: false, error: result.error });
        }
        break;

      default:
        // Standard JSON response
        res.json(result);
    }

    // Log mobile download attempt
    if (deviceId) {
      logger.info('Mobile download triggered', {
        contentId: contentId.substring(0, 8) + '...',
        deviceId: deviceId.substring(0, 8) + '...',
        returnFormat,
        success: result.success
      });
    }

  } catch (error) {
    logger.error('Mobile download trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger download' });
  }
});

// Mobile-optimized downloads list (lightweight)
mobileApiRouter.get('/downloads', async (req, res) => {
  try {
    const { 
      limit = '10', 
      offset = '0',
      status,
      fields = 'compact' // compact | full
    } = req.query;

    const whereClause: any = {};
    if (status) whereClause.status = status;

    const content = await prisma.content.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      include: {
        downloads: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: fields === 'compact' ? {
            id: true,
            status: true,
            progress: true,
            speedBps: true,
            etaSeconds: true
          } : undefined
        }
      },
      select: fields === 'compact' ? {
        id: true,
        type: true,
        title: true,
        season: true,
        episode: true,
        status: true,
        progress: true,
        quality: true,
        fileSize: true,
        posterUrl: true,
        updatedAt: true,
        downloads: true
      } : undefined
    });

    // Mobile-optimized response
    const mobileItems = content.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      subtitle: item.type === 'series' && item.season && item.episode ? 
        `S${item.season}E${item.episode}` : item.quality || '',
      status: item.status,
      progress: item.progress || 0,
      poster: item.posterUrl,
      fileSize: item.fileSize ? Number(item.fileSize) : null,
      updatedAt: item.updatedAt,
      // Playback URLs for mobile players
      playUrl: item.status === 'completed' ? 
        `http://127.0.0.1:${process.env.PORT || 11471}/files/${encodeURIComponent(item.id)}` : null,
      // Download management actions
      actions: {
        canPause: item.status === 'downloading',
        canResume: item.status === 'paused',
        canDelete: ['completed', 'failed'].includes(item.status || ''),
        canRetry: item.status === 'failed'
      },
      download: item.downloads[0] ? {
        id: item.downloads[0].id,
        progress: item.downloads[0].progress || 0,
        speed: item.downloads[0].speedBps ? Number(item.downloads[0].speedBps) : null,
        eta: item.downloads[0].etaSeconds
      } : null
    }));

    // Include summary stats for mobile UI
    const stats = await getDownloadStats();

    res.json({
      items: mobileItems,
      total: mobileItems.length,
      hasMore: mobileItems.length === Number(limit),
      stats: fields === 'full' ? stats : undefined
    });

  } catch (error) {
    logger.error('Mobile downloads list error:', error);
    res.status(500).json({ error: 'Failed to get downloads' });
  }
});

// Real-time download progress (Server-Sent Events for PWA)
mobileApiRouter.get('/downloads/:contentId/progress', async (req, res) => {
  const { contentId } = req.params;
  
  // Set up Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial progress
  try {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: {
        downloads: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (content) {
      const progressData = {
        contentId,
        status: content.status,
        progress: content.progress || 0,
        download: content.downloads[0] ? {
          speed: content.downloads[0].speedBps ? Number(content.downloads[0].speedBps) : null,
          eta: content.downloads[0].etaSeconds
        } : null
      };
      
      res.write(`data: ${JSON.stringify(progressData)}\n\n`);
    }
  } catch (error) {
    logger.error('Progress stream init error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Failed to get progress' })}\n\n`);
  }

  // Set up periodic updates
  const interval = setInterval(async () => {
    try {
      const content = await prisma.content.findUnique({
        where: { id: contentId },
        include: {
          downloads: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      if (content) {
        const progressData = {
          contentId,
          status: content.status,
          progress: content.progress || 0,
          download: content.downloads[0] ? {
            speed: content.downloads[0].speedBps ? Number(content.downloads[0].speedBps) : null,
            eta: content.downloads[0].etaSeconds
          } : null,
          timestamp: Date.now()
        };
        
        res.write(`data: ${JSON.stringify(progressData)}\n\n`);

        // Stop streaming if download is complete or failed
        if (['completed', 'failed'].includes(content.status || '')) {
          clearInterval(interval);
          res.end();
        }
      }
    } catch (error) {
      logger.error('Progress stream update error:', error);
      clearInterval(interval);
      res.end();
    }
  }, 2000); // Update every 2 seconds

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

// Mobile download management actions
mobileApiRouter.patch('/downloads/:contentId/:action', async (req, res) => {
  try {
    const { contentId, action } = req.params;

    switch (action) {
      case 'pause':
        await prisma.content.update({
          where: { id: contentId },
          data: { status: 'paused' }
        });
        await prisma.download.updateMany({
          where: { contentId },
          data: { status: 'paused' }
        });
        break;

      case 'resume':
        await prisma.content.update({
          where: { id: contentId },
          data: { status: 'downloading' }
        });
        await prisma.download.updateMany({
          where: { contentId },
          data: { status: 'downloading' }
        });
        break;

      case 'retry':
        // Reset failed download
        await prisma.content.update({
          where: { id: contentId },
          data: { 
            status: 'queued',
            progress: 0
          }
        });
        // Trigger re-download via internal API
        const downloadResponse = await fetch(`http://127.0.0.1:${process.env.PORT || 11471}/download/${encodeURIComponent(contentId)}`, {
          method: 'GET'
        });
        if (!downloadResponse.ok) {
          throw new Error('Failed to restart download');
        }
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({ success: true, action, contentId });

  } catch (error) {
    logger.error('Mobile download action error:', error);
    res.status(500).json({ error: 'Failed to perform action' });
  }
});

// Generate custom URL schemes for companion apps
mobileApiRouter.get('/intent/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { 
      scheme = 'offlinio',  // Custom URL scheme
      action = 'download',  // download | play | manage
      fallback          // Fallback URL if app not installed
    } = req.query;

    const content = await prisma.content.findUnique({
      where: { id: contentId }
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Generate intent URLs for different platforms
    const intentUrls = {
      // Android
      android: `intent://${action}?contentId=${encodeURIComponent(contentId)}&title=${encodeURIComponent(content.title)}#Intent;scheme=${scheme};package=com.offlinio.companion;end`,
      
      // iOS Universal Links
      ios: `https://offlinio.app/${action}?contentId=${encodeURIComponent(contentId)}`,
      
      // Custom scheme (works on both)
      custom: `${scheme}://${action}?contentId=${encodeURIComponent(contentId)}&title=${encodeURIComponent(content.title)}`,
      
      // Web fallback
      web: fallback || `http://127.0.0.1:${process.env.PORT || 11471}/ui/`
    };

    res.json({
      contentId,
      action,
      intents: intentUrls,
      content: {
        title: content.title,
        type: content.type,
        status: content.status,
        progress: content.progress
      }
    });

  } catch (error) {
    logger.error('Intent generation error:', error);
    res.status(500).json({ error: 'Failed to generate intent' });
  }
});

// Helper function to get download statistics
async function getDownloadStats() {
  const [total, completed, active, failed] = await Promise.all([
    prisma.content.count(),
    prisma.content.count({ where: { status: 'completed' } }),
    prisma.content.count({ where: { status: { in: ['downloading', 'queued', 'processing'] } } }),
    prisma.content.count({ where: { status: 'failed' } })
  ]);

  const sizeResult = await prisma.content.aggregate({
    _sum: { fileSize: true },
    where: { status: 'completed' }
  });

  const totalSize = sizeResult._sum.fileSize ? Number(sizeResult._sum.fileSize) : 0;

  return {
    total,
    completed,
    active,
    failed,
    totalSizeBytes: totalSize,
    totalSizeGB: Math.round(totalSize / (1024 * 1024 * 1024) * 100) / 100
  };
}

logger.info('Mobile API router initialized');
