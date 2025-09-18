/**
 * Setup API Routes
 * 
 * Provides endpoints for first-run setup wizard
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { SetupWizard } from '../setup-wizard.js';
import { TokenManager } from '../services/token-manager.js';

export function createSetupRouter(prisma: PrismaClient): express.Router {
  const router = express.Router();
  const setupWizard = new SetupWizard(prisma);
  const tokenManager = new TokenManager(prisma);

  // Check if setup is required
  router.get('/required', async (req, res) => {
    try {
      const required = await setupWizard.isSetupRequired();
      res.json({ required });
    } catch (error) {
      logger.error('Setup check failed:', error);
      res.status(500).json({ error: 'Failed to check setup status' });
    }
  });

  // Get default storage paths
  router.get('/storage/defaults', async (req, res) => {
    try {
      const defaults = setupWizard.getDefaultStoragePaths();
      res.json({ paths: defaults });
    } catch (error) {
      logger.error('Failed to get default paths:', error);
      res.status(500).json({ error: 'Failed to get default storage paths' });
    }
  });

  // Validate storage directory
  router.post('/storage/validate', async (req, res) => {
    try {
      const { path } = req.body;
      if (!path) {
        return res.status(400).json({ error: 'Path is required' });
      }

      const validation = await setupWizard.validateStorageDirectory(path);
      res.json(validation);
    } catch (error) {
      logger.error('Storage validation failed:', error);
      res.status(500).json({ error: 'Failed to validate storage directory' });
    }
  });

  // Validate Real-Debrid token
  router.post('/token/validate', async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      const validation = await tokenManager.validateToken(token);
      res.json(validation);
    } catch (error) {
      logger.error('Token validation failed:', error);
      res.status(500).json({ error: 'Failed to validate token' });
    }
  });

  // Save complete setup
  router.post('/complete', async (req, res) => {
    try {
      const { storageDirectory, realDebridToken, legalAccepted } = req.body;

      if (!legalAccepted) {
        return res.status(400).json({ error: 'Legal terms must be accepted' });
      }

      if (!storageDirectory) {
        return res.status(400).json({ error: 'Storage directory is required' });
      }

      const config = {
        storageDirectory,
        realDebridToken,
        legalAccepted: true,
        setupCompleted: true
      };

      await setupWizard.saveSetupConfig(config);

      res.json({ 
        success: true, 
        message: 'Setup completed successfully',
        redirect: '/ui/' 
      });
    } catch (error) {
      logger.error('Setup completion failed:', error);
      res.status(500).json({ error: 'Failed to complete setup' });
    }
  });

  // Get current setup status
  router.get('/status', async (req, res) => {
    try {
      const config = await setupWizard.getSetupConfig();
      const validation = await setupWizard.validateSetup();
      const hasValidToken = await tokenManager.isTokenValid();
      const accountInfo = await tokenManager.getAccountInfo();

      res.json({
        config,
        validation,
        hasValidToken,
        accountInfo
      });
    } catch (error) {
      logger.error('Failed to get setup status:', error);
      res.status(500).json({ error: 'Failed to get setup status' });
    }
  });

  // Reset setup (for testing or reconfiguration)
  router.post('/reset', async (req, res) => {
    try {
      await setupWizard.resetSetup();
      res.json({ success: true, message: 'Setup reset successfully' });
    } catch (error) {
      logger.error('Setup reset failed:', error);
      res.status(500).json({ error: 'Failed to reset setup' });
    }
  });

  return router;
}
