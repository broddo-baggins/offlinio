/**
 * Legal Compliance API Routes
 * 
 * Handles legal notice display, acceptance, and compliance checking
 */

import express from 'express';
import { LegalNoticeService } from './services/legal-notice.js';
import { logger } from './utils/logger.js';

export const legalRouter = express.Router();
const legalNoticeService = new LegalNoticeService();

// Get legal notice content
legalRouter.get('/notice', async (req, res) => {
  try {
    const notice = await legalNoticeService.getLegalNoticeForDisplay();
    res.json(notice);
  } catch (error) {
    logger.error('Failed to get legal notice:', error);
    res.status(500).json({ error: 'Failed to retrieve legal notice' });
  }
});

// Record legal notice acceptance
legalRouter.post('/accept', async (req, res) => {
  try {
    const { accepted } = req.body;
    const userAgent = req.get('User-Agent');
    const ipAddress = req.ip;

    if (typeof accepted !== 'boolean') {
      return res.status(400).json({ error: 'Acceptance value must be boolean' });
    }

    const acceptance = await legalNoticeService.recordUserAcceptance(
      accepted,
      userAgent,
      ipAddress
    );

    if (accepted) {
      logger.info('User accepted legal notice');
      res.json({ 
        success: true, 
        message: 'Legal notice accepted',
        acceptance 
      });
    } else {
      logger.info('User declined legal notice');
      res.status(403).json({ 
        success: false, 
        message: 'Legal notice must be accepted to use Offlinio' 
      });
    }
  } catch (error) {
    logger.error('Failed to record legal acceptance:', error);
    res.status(500).json({ error: 'Failed to record acceptance' });
  }
});

// Check user access status
legalRouter.get('/status', async (req, res) => {
  try {
    const access = await legalNoticeService.validateUserAccess();
    res.json(access);
  } catch (error) {
    logger.error('Failed to check legal status:', error);
    res.status(500).json({ error: 'Failed to check legal status' });
  }
});

// Get acceptance history (for debugging/admin)
legalRouter.get('/history', async (req, res) => {
  try {
    const history = await legalNoticeService.getUserAcceptanceHistory();
    res.json({ history });
  } catch (error) {
    logger.error('Failed to get acceptance history:', error);
    res.status(500).json({ error: 'Failed to retrieve history' });
  }
});
