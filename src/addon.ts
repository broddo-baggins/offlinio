/**
 * Stremio Addon Interface
 * 
 * Implements the Stremio addon protocol with:
 * - Manifest generation
 * - Catalog endpoints (Downloaded Movies, Downloaded Series)
 * - Meta endpoints (series episode lists)
 * - Stream endpoints (local file URLs)
 */

import express from 'express';
import { logger } from './utils/logger.js';
import { 
  getDownloadedCatalog, 
  getSeriesMeta, 
  getLocalStreamForId 
} from './services/catalog.js';
import { AutoDebridDetector } from './services/auto-debrid.js';
import { CometIntegration } from './services/comet-integration.js';

// Stremio addon manifest
const manifest = {
  id: 'community.offlinio',
  version: '0.1.0',
  name: 'Offlinio',
  description: 'Personal Media Downloader - Download content you have legal rights to access',
  logo: 'https://via.placeholder.com/256x256/1a1a1a/ffffff?text=Offlinio',
  background: 'https://via.placeholder.com/1920x1080/1a1a1a/ffffff?text=Offlinio',
  
  // Catalog definitions
  catalogs: [
    {
      id: 'offlinio-movies',
      type: 'movie',
      name: 'Downloaded Movies',
      extra: [
        { name: 'search', isRequired: false },
        { name: 'genre', isRequired: false }
      ]
    },
    {
      id: 'offlinio-series',
      type: 'series', 
      name: 'Downloaded Series',
      extra: [
        { name: 'search', isRequired: false },
        { name: 'genre', isRequired: false }
      ]
    }
  ],
  
  // Supported resources
  resources: ['catalog', 'meta', 'stream'],
  
  // Supported content types
  types: ['movie', 'series'],
  
  // ID prefixes we handle
  idPrefixes: ['tt', 'local', 'offlinio'],
  
  // Addon behavior
  behaviorHints: {
    adult: false,
    p2p: false,
    configurable: true,
    configurationRequired: false
  }
};

// Create Express router for addon endpoints
export const addonRouter = express.Router();

// Auto-detect and handle download requests
addonRouter.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Trigger download process - auto-detect source
    const downloadResult = await triggerAutoDownload(id);
    
    if (downloadResult.success) {
      res.json({
        message: 'Download started',
        downloadId: downloadResult.downloadId,
        redirect: `http://127.0.0.1:${process.env.PORT || 11471}/ui/`
      });
    } else {
      res.status(400).json({
        error: downloadResult.error || 'Failed to start download'
      });
    }
  } catch (error) {
    logger.error('Download trigger error:', error);
    res.status(500).json({ error: 'Failed to process download request' });
  }
});

// Initialize auto-debrid detector and Comet integration
const autoDebridDetector = new AutoDebridDetector();
const cometIntegration = new CometIntegration();

// Auto-download function - detects available services automatically
async function triggerAutoDownload(contentId: string) {
  try {
    logger.info('Auto-detecting download source for content:', { 
      contentId: contentId.substring(0, 10) + '...' 
    });
    
    // Parse content ID to determine type and details
    const { type, imdbId, season, episode } = parseContentId(contentId);
    
    // Get best magnet link from Comet (same as user sees in Stremio)
    const bestMagnet = await cometIntegration.getBestMagnetForContent(
      type, 
      imdbId, 
      season, 
      episode
    );
    
    if (!bestMagnet) {
      return {
        success: false,
        error: 'No torrent sources found for this content'
      };
    }
    
    logger.info('Found magnet link from Comet', {
      title: bestMagnet.title,
      quality: bestMagnet.quality,
      size: bestMagnet.size
    });
    
    // Auto-detect available services and resolve download
    const result = await autoDebridDetector.autoResolveDownload(
      contentId,
      bestMagnet.magnetUri  // Pass the magnet link from Comet
    );
    
    if (result.success && result.downloadUrl) {
      // Create download job through the downloads API
      const downloadResponse = await fetch(`http://127.0.0.1:${process.env.PORT || 11471}/api/downloads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contentId,
          type,
          title: bestMagnet.title,
          season,
          episode,
          directUrl: result.downloadUrl,
          quality: bestMagnet.quality,
          description: `Downloaded via ${result.service || 'auto-detection'} (${bestMagnet.size || 'unknown size'})`
        })
      });
      
      if (downloadResponse.ok) {
        const downloadData = await downloadResponse.json() as any;
        return {
          success: true,
          downloadId: downloadData.downloadId,
          source: result.service,
          isPublicDomain: result.isPublicDomain,
          magnetTitle: bestMagnet.title
        };
      }
    }
    
    return {
      success: false,
      error: result.error || 'Failed to resolve download automatically'
    };
    
  } catch (error) {
    logger.error('Auto-download failed:', error);
    return {
      success: false,
      error: 'Auto-download service error'
    };
  }
}

// Helper function to parse Stremio content IDs
function parseContentId(contentId: string): {
  type: 'movie' | 'series';
  imdbId: string;
  season?: number;
  episode?: number;
} {
  // Handle series format: tt1234567:1:1 (IMDB:season:episode)
  if (contentId.includes(':')) {
    const parts = contentId.split(':');
    const imdbId = parts[0];
    const season = parseInt(parts[1], 10);
    const episode = parseInt(parts[2], 10);
    
    return {
      type: 'series',
      imdbId,
      season,
      episode
    };
  }
  
  // Handle movie format: tt1234567
  return {
    type: 'movie',
    imdbId: contentId
  };
}

// Manifest endpoint
addonRouter.get('/manifest.json', (req, res) => {
  logger.debug('Serving addon manifest');
  res.json(manifest);
});

// Catalog endpoint
addonRouter.get('/catalog/:type/:id.json', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { search, genre, skip } = req.query;
    
    logger.debug(`Catalog request: ${type}/${id}`, { search, genre, skip });
    
    const metas = await getDownloadedCatalog(type, id, {
      search: search as string,
      genre: genre as string,
      skip: Number(skip) || 0
    });
    
    res.json({ metas });
  } catch (error) {
    logger.error('Catalog error:', error);
    res.status(500).json({ 
      metas: [],
      error: 'Failed to fetch catalog' 
    });
  }
});

// Meta endpoint (for series episode lists)
addonRouter.get('/meta/:type/:id.json', async (req, res) => {
  try {
    const { type, id } = req.params;
    
    logger.debug(`Meta request: ${type}/${id}`);
    
    if (type === 'series') {
      const meta = await getSeriesMeta(id);
      res.json({ meta });
    } else {
      // For movies, return basic meta
      res.json({ meta: { id, type } });
    }
  } catch (error) {
    logger.error('Meta error:', error);
    res.status(500).json({ 
      meta: {},
      error: 'Failed to fetch metadata' 
    });
  }
});

// Stream endpoint with enhanced UX
addonRouter.get('/stream/:type/:id.json', async (req, res) => {
  try {
    const { type, id } = req.params;
    
    logger.debug(`Stream request: ${type}/${id}`);
    
    // Track performance metric
    const startTime = Date.now();
    
    const localStream = await getLocalStreamForId(id);
    const streams = [];
    
    // Add local stream if content is downloaded
    if (localStream) {
      streams.push({
        name: 'Play Offline',
        title: 'Play from your device (downloaded)',
        url: localStream.url,
        behaviorHints: {
          counterSeeds: 0,
          counterPeers: 0
        }
      });
    }
    
    // Check if download is in progress
    const downloadStatus = await getDownloadStatus(id);
    
    if (downloadStatus && downloadStatus.status === 'downloading') {
      streams.push({
        name: `Downloading... (${downloadStatus.progress}%)`,
        title: 'Download in progress - click to manage',
        url: `http://127.0.0.1:${process.env.PORT || 11471}/download/status/${encodeURIComponent(id)}`,
        behaviorHints: {
          notWebReady: true, // Prevents accidental playback attempts
          bingeGroup: 'offlinio-progress'
        }
      });
    } else {
      // Add download trigger if not downloading
      streams.push({
        name: 'Download for Offline',
        title: 'Download this content to your device',
        url: `http://127.0.0.1:${process.env.PORT || 11471}/download/${encodeURIComponent(id)}`,
        behaviorHints: {
          notWebReady: false,
          bingeGroup: 'offlinio-download'
        }
      });
    }
    
    // Track response time
    const responseTime = Date.now() - startTime;
    // Note: Would integrate with analytics service here
    
    res.json({ streams });
  } catch (error) {
    logger.error('Stream error:', error);
    res.status(500).json({ 
      streams: [],
      error: 'Failed to resolve streams' 
    });
  }
});

// Helper function to get download status
async function getDownloadStatus(contentId: string): Promise<{ status: string; progress: number } | null> {
  // This would query the download status from database/memory
  // Implementation depends on your download tracking system
  return null; // Placeholder
}

// Health check for addon
addonRouter.get('/addon-health', (req, res) => {
  res.json({
    addon: 'Offlinio',
    status: 'healthy',
    manifest: manifest.id,
    version: manifest.version,
    timestamp: new Date().toISOString()
  });
});

logger.info('Stremio addon router initialized');
logger.info(`Addon ID: ${manifest.id}`);
logger.info(`Addon Version: ${manifest.version}`);
logger.info(`Supported Types: ${manifest.types.join(', ')}`);
logger.info(`Resources: ${manifest.resources.join(', ')}`);
