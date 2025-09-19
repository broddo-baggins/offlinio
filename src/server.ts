/**
 * Offlinio Server - Single Addon Architecture
 * 
 * This file bootstraps the entire Offlinio application in a single process:
 * - Stremio addon endpoints (manifest, catalog, meta, stream)
 * - Real-Debrid integration
 * - Download management API
 * - Local file server
 * - Web UI
 * - Legal compliance system
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import dotenv from 'dotenv';

// Import modules
import { addonRouter } from './addon.js';
import { createFilesRouter, fileStreaming } from './files.js';
import { downloadsRouter } from './downloads.js';
// Real-Debrid auto-detection - no user configuration needed
import { legalRouter } from './legal.js';
import { initializeDatabase, prisma } from './db.js';
import { logger } from './utils/logger.js';
import { LegalNoticeService } from './services/legal-notice.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    // Parse command-line arguments for SDK compatibility
    const args = process.argv.slice(2);
    const shouldLaunch = args.includes('--launch');
    const shouldInstall = args.includes('--install');
    const isDev = args.includes('--dev');
    
    if (isDev) {
      logger.info('🔧 Starting in development mode with enhanced debugging');
      process.env.LOG_LEVEL = 'debug';
    }
    
    // Initialize database
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Initialize legal notice service
    const legalNoticeService = new LegalNoticeService();
    await legalNoticeService.initialize();
    logger.info('Legal notice service initialized');

    // Create Express app
    const app = express();

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // Basic middleware
    app.use(compression());
    app.use(cors({
      origin: true, // Allow all origins for Stremio compatibility
      credentials: true
    }));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Request logging
    app.use((req, res, next) => {
      logger.debug(`${req.method} ${req.path}`, {
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      next();
    });

    // Legal compliance middleware
    app.use(async (req, res, next) => {
      // Skip legal check for Stremio addon endpoints (must be publicly accessible)
      const stremioEndpoints = [
        '/manifest.json',
        '/catalog/',
        '/meta/',
        '/stream/',
        '/health'
      ];
      
      // Skip legal check for legal endpoints themselves, UI, files, and Stremio addon endpoints
      if (req.path.startsWith('/api/legal') || 
          req.path.startsWith('/ui') ||
          req.path.startsWith('/files') ||
          stremioEndpoints.some(endpoint => req.path.includes(endpoint))) {
        return next();
      }

      // Check if legal notice has been accepted
      const hasAccepted = await legalNoticeService.hasUserAcceptedLatest();
      
      if (!hasAccepted) {
        return res.status(451).json({
          error: 'Legal notice acceptance required',
          message: 'You must accept the legal notice before using Offlinio',
          legalNoticeUrl: '/ui/legal'
        });
      }

      next();
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Stremio addon endpoints (on root path)
    app.use('/', addonRouter);

    // API routes
    app.use('/api/legal', legalRouter);
    app.use('/api/downloads', downloadsRouter);

    // Mobile API routes
    const { mobileApiRouter } = await import('./routes/mobile-api.js');
    app.use('/mobile', mobileApiRouter);

    // Setup routes
    const { createSetupRouter } = await import('./routes/setup.js');
    app.use('/api/setup', createSetupRouter(prisma));

    // PWA Manifest
    app.get('/manifest.json', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'src', 'pwa-manifest.json'));
    });

    // Static web UI
    app.use('/ui', express.static(path.join(process.cwd(), 'src', 'ui')));

    // File server for playback (with streaming support)
    const filesRouter = await createFilesRouter();
    app.use('/files', fileStreaming, filesRouter);

    // Default route - redirect to manifest or UI
    app.get('/', (req, res) => {
      res.json({
        name: 'Offlinio',
        version: '0.1.0',
        description: 'Personal Media Downloader for Stremio',
        manifest: `http://127.0.0.1:${port}/manifest.json`,
        webUI: `http://127.0.0.1:${port}/ui/`,
        health: `http://127.0.0.1:${port}/health`
      });
    });

    // Error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        error: 'Not found',
        message: `Path ${req.path} not found`
      });
    });

    // Start server
    const port = Number(process.env.PORT || 11471);
    const server = createServer(app);

    server.listen(port, '127.0.0.1', () => {
      logger.info(`🚀 Offlinio server started successfully!`);
      logger.info(`📺 Stremio Manifest: http://127.0.0.1:${port}/manifest.json`);
      logger.info(`🌐 Web UI: http://127.0.0.1:${port}/ui/`);
      logger.info(`📁 File Server: http://127.0.0.1:${port}/files/`);
      logger.info(`🏥 Health Check: http://127.0.0.1:${port}/health`);
      logger.info(`🔧 API Endpoints: http://127.0.0.1:${port}/api/`);
      
      // SDK-compatible shortcuts
      if (shouldLaunch) {
        handleLaunchShortcut(port);
      } else if (shouldInstall) {
        handleInstallShortcut(port);
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * SDK-compatible launch shortcut
 * Opens Stremio Web with addon pre-installed
 */
function handleLaunchShortcut(port: number): void {
  const manifestUrl = `http://127.0.0.1:${port}/manifest.json`;
  const stremioWebUrl = `https://app.strem.io/shell-v4.4/?addon=${encodeURIComponent(manifestUrl)}`;
  
  logger.info('🚀 SDK Launch Mode: Opening Stremio Web with addon pre-installed...');
  logger.info(`🌐 Stremio Web URL: ${stremioWebUrl}`);
  
  // Open browser (cross-platform)
  const { exec } = require('child_process');
  const opener = process.platform === 'darwin' ? 'open' : 
                 process.platform === 'win32' ? 'start' : 'xdg-open';
  
  exec(`${opener} "${stremioWebUrl}"`, (error: any) => {
    if (error) {
      logger.warn('Could not auto-open browser. Please manually visit:', stremioWebUrl);
    } else {
      logger.info('✅ Stremio Web opened successfully with addon pre-installed');
    }
  });
}

/**
 * SDK-compatible install shortcut
 * Opens desktop Stremio and shows install prompt
 */
function handleInstallShortcut(port: number): void {
  const manifestUrl = `http://127.0.0.1:${port}/manifest.json`;
  
  logger.info('🔧 SDK Install Mode: Opening Stremio Desktop with install prompt...');
  logger.info(`📱 Manifest URL for manual installation: ${manifestUrl}`);
  logger.info('📋 Installation Instructions:');
  logger.info('   1. Open Stremio Desktop');
  logger.info('   2. Go to Add-ons → Community Add-ons');
  logger.info('   3. Click "Add Addon" and paste the URL above');
  logger.info('   4. Click "Install"');
  
  // Try to open Stremio if available
  const { exec } = require('child_process');
  const stremioCommands = ['stremio', 'Stremio', '/Applications/Stremio.app/Contents/MacOS/Stremio'];
  
  let attemptedCommand = false;
  for (const command of stremioCommands) {
    if (!attemptedCommand) {
      exec(command, (error: any) => {
        if (!error) {
          logger.info('✅ Stremio Desktop opened successfully');
          attemptedCommand = true;
        }
      });
    }
  }
  
  if (!attemptedCommand) {
    logger.warn('ℹ️  Could not auto-launch Stremio Desktop. Please open manually.');
  }
}

// Start the server
startServer().catch((error) => {
  logger.error('Fatal error during startup:', error);
  process.exit(1);
});
