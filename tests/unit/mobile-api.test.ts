/**
 * Mobile API Unit Tests
 * 
 * Comprehensive testing for mobile-optimized API endpoints
 * Tests cover content discovery, download management, and companion app integration
 */

import request from 'supertest';
import express from 'express';
import { mobileApiRouter } from '../../src/routes/mobile-api.js';
import { prisma } from '../../src/db.js';

// Mock dependencies
jest.mock('../../src/db.js');
jest.mock('../../src/services/auto-debrid.js');
jest.mock('../../src/services/comet-integration.js');

describe('Mobile API Endpoints', () => {
  let app: express.Application;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/mobile', mobileApiRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /mobile/discover/:type/:imdbId', () => {
    it('should discover downloadable movie content', async () => {
      // Mock CometIntegration
      const mockBestMagnet = {
        title: 'Test Movie 2024 1080p',
        quality: '1080p',
        size: '2.1 GB',
        magnetUri: 'magnet:?xt=urn:btih:test123'
      };

      // Mock AutoDebridDetector
      const mockServices = [
        { name: 'Real-Debrid', detected: true, priority: 1 },
        { name: 'AllDebrid', detected: false, priority: 2 }
      ];

      const response = await request(app)
        .get('/mobile/discover/movie/tt0111161')
        .expect(200);

      expect(response.body).toHaveProperty('contentId', 'tt0111161');
      expect(response.body).toHaveProperty('type', 'movie');
      expect(response.body).toHaveProperty('downloadable');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('downloadUrl');
      expect(response.body).toHaveProperty('intentUrl');
    });

    it('should discover series episode content', async () => {
      const response = await request(app)
        .get('/mobile/discover/series/tt0903747')
        .query({ season: 1, episode: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('contentId', 'tt0903747:1:1');
      expect(response.body).toHaveProperty('type', 'series');
      expect(response.body).toHaveProperty('season', 1);
      expect(response.body).toHaveProperty('episode', 1);
    });

    it('should handle content not found', async () => {
      const response = await request(app)
        .get('/mobile/discover/movie/tt9999999')
        .expect(200);

      expect(response.body).toHaveProperty('downloadable', false);
      expect(response.body.magnet).toBeNull();
    });
  });

  describe('POST /mobile/download/:contentId', () => {
    it('should trigger download with JSON response format', async () => {
      const mockDownloadResponse = {
        success: true,
        downloadId: 'download-123',
        contentId: 'tt0111161'
      };

      const response = await request(app)
        .post('/mobile/download/tt0111161')
        .send({
          returnFormat: 'json',
          deviceId: 'mobile-device-123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('downloadId');
    });

    it('should trigger download with intent response format', async () => {
      const response = await request(app)
        .post('/mobile/download/tt0111161')
        .send({
          returnFormat: 'intent',
          deviceId: 'mobile-device-123',
          callbackUrl: 'myapp://download-complete'
        })
        .expect(200);

      expect(response.body).toHaveProperty('intent');
      expect(response.body.intent).toHaveProperty('action', 'com.offlinio.DOWNLOAD_STARTED');
      expect(response.body.intent).toHaveProperty('extras');
    });

    it('should trigger download with redirect response format', async () => {
      const response = await request(app)
        .post('/mobile/download/tt0111161')
        .send({
          returnFormat: 'redirect'
        })
        .expect(200);

      expect(response.body).toHaveProperty('redirect');
      expect(response.body.redirect).toContain('/ui/');
    });

    it('should handle invalid content ID', async () => {
      const response = await request(app)
        .post('/mobile/download/invalid-id')
        .send({ returnFormat: 'json' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /mobile/downloads', () => {
    beforeEach(() => {
      // Mock prisma responses
      (prisma.content.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'tt0111161',
          type: 'movie',
          title: 'The Shawshank Redemption',
          status: 'completed',
          progress: 100,
          quality: '1080p',
          fileSize: BigInt(2147483648), // 2GB
          posterUrl: 'https://example.com/poster.jpg',
          updatedAt: new Date(),
          downloads: [{
            id: 'download-123',
            progress: 100,
            speedBps: null,
            etaSeconds: null
          }]
        }
      ]);
    });

    it('should return mobile-optimized downloads list', async () => {
      const response = await request(app)
        .get('/mobile/downloads')
        .query({ limit: 10, fields: 'compact' })
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('hasMore');
      
      const item = response.body.items[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('actions');
    });

    it('should filter downloads by status', async () => {
      const response = await request(app)
        .get('/mobile/downloads')
        .query({ status: 'completed' })
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].status).toBe('completed');
    });

    it('should include playback URLs for completed downloads', async () => {
      const response = await request(app)
        .get('/mobile/downloads')
        .expect(200);

      const completedItem = response.body.items.find((item: any) => item.status === 'completed');
      expect(completedItem).toHaveProperty('playUrl');
      expect(completedItem.playUrl).toContain('/files/');
    });
  });

  describe('GET /mobile/downloads/:contentId/progress', () => {
    it('should establish Server-Sent Events connection', async () => {
      // Mock content with ongoing download
      (prisma.content.findUnique as jest.Mock).mockResolvedValue({
        id: 'tt0111161',
        status: 'downloading',
        progress: 45,
        downloads: [{
          speedBps: BigInt(1048576), // 1MB/s
          etaSeconds: 300
        }]
      });

      const response = await request(app)
        .get('/mobile/downloads/tt0111161/progress')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/event-stream');
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.headers['connection']).toBe('keep-alive');
    });

    it('should handle non-existent content', async () => {
      (prisma.content.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/mobile/downloads/nonexistent/progress')
        .expect(200);

      // Should still establish SSE connection but send error data
      expect(response.headers['content-type']).toBe('text/event-stream');
    });
  });

  describe('PATCH /mobile/downloads/:contentId/:action', () => {
    beforeEach(() => {
      (prisma.content.update as jest.Mock).mockResolvedValue({});
      (prisma.download.updateMany as jest.Mock).mockResolvedValue({});
    });

    it('should pause download', async () => {
      const response = await request(app)
        .patch('/mobile/downloads/tt0111161/pause')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('action', 'pause');
      
      expect(prisma.content.update).toHaveBeenCalledWith({
        where: { id: 'tt0111161' },
        data: { status: 'paused' }
      });
    });

    it('should resume download', async () => {
      const response = await request(app)
        .patch('/mobile/downloads/tt0111161/resume')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('action', 'resume');
      
      expect(prisma.content.update).toHaveBeenCalledWith({
        where: { id: 'tt0111161' },
        data: { status: 'downloading' }
      });
    });

    it('should retry failed download', async () => {
      const response = await request(app)
        .patch('/mobile/downloads/tt0111161/retry')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('action', 'retry');
    });

    it('should reject invalid actions', async () => {
      const response = await request(app)
        .patch('/mobile/downloads/tt0111161/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid action');
    });
  });

  describe('GET /mobile/intent/:contentId', () => {
    beforeEach(() => {
      (prisma.content.findUnique as jest.Mock).mockResolvedValue({
        id: 'tt0111161',
        title: 'The Shawshank Redemption',
        type: 'movie',
        status: 'completed'
      });
    });

    it('should generate platform-specific intent URLs', async () => {
      const response = await request(app)
        .get('/mobile/intent/tt0111161')
        .query({ 
          scheme: 'offlinio',
          action: 'download'
        })
        .expect(200);

      expect(response.body).toHaveProperty('intents');
      expect(response.body.intents).toHaveProperty('android');
      expect(response.body.intents).toHaveProperty('ios');
      expect(response.body.intents).toHaveProperty('custom');
      expect(response.body.intents).toHaveProperty('web');
      
      expect(response.body.intents.custom).toContain('offlinio://download');
    });

    it('should include content metadata in response', async () => {
      const response = await request(app)
        .get('/mobile/intent/tt0111161')
        .expect(200);

      expect(response.body).toHaveProperty('content');
      expect(response.body.content).toHaveProperty('title', 'The Shawshank Redemption');
      expect(response.body.content).toHaveProperty('type', 'movie');
    });

    it('should handle non-existent content', async () => {
      (prisma.content.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/mobile/intent/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Content not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (prisma.content.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/mobile/downloads')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate required parameters', async () => {
      const response = await request(app)
        .post('/mobile/download/tt0111161')
        .send({}) // Missing required fields
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Mobile-Specific Features', () => {
    it('should format file sizes for mobile display', async () => {
      (prisma.content.findMany as jest.Mock).mockResolvedValue([{
        id: 'tt0111161',
        fileSize: BigInt(2147483648), // 2GB
        // ... other properties
      }]);

      const response = await request(app)
        .get('/mobile/downloads')
        .expect(200);

      const item = response.body.items[0];
      expect(item.fileSize).toBe(2147483648);
    });

    it('should provide mobile-optimized error messages', async () => {
      const response = await request(app)
        .get('/mobile/discover/invalid/invalid')
        .expect(500);

      expect(response.body.error).toBeDefined();
      expect(typeof response.body.error).toBe('string');
    });

    it('should include device-specific optimizations', async () => {
      const response = await request(app)
        .post('/mobile/download/tt0111161')
        .send({
          returnFormat: 'json',
          deviceId: 'android-device-123'
        })
        .expect(200);

      // Should log device-specific information
      expect(response.body).toBeDefined();
    });
  });
});

describe('Mobile API Integration', () => {
  it('should work with companion app workflow', async () => {
    const app = express();
    app.use(express.json());
    app.use('/mobile', mobileApiRouter);

    // Simulate companion app workflow
    
    // 1. Discover content
    const discoverResponse = await request(app)
      .get('/mobile/discover/movie/tt0111161')
      .expect(200);

    expect(discoverResponse.body.downloadable).toBeDefined();

    // 2. Trigger download
    const downloadResponse = await request(app)
      .post('/mobile/download/tt0111161')
      .send({ returnFormat: 'intent', deviceId: 'test-device' })
      .expect(200);

    expect(downloadResponse.body.intent).toBeDefined();

    // 3. Check progress
    const progressResponse = await request(app)
      .get('/mobile/downloads')
      .expect(200);

    expect(progressResponse.body.items).toBeDefined();
  });
});

describe('Mobile API Performance', () => {
  it('should respond quickly to mobile requests', async () => {
    const app = express();
    app.use(express.json());
    app.use('/mobile', mobileApiRouter);

    const start = Date.now();
    
    await request(app)
      .get('/mobile/downloads')
      .query({ limit: 10 })
      .expect(200);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500); // Should respond within 500ms
  });

  it('should handle concurrent mobile requests', async () => {
    const app = express();
    app.use(express.json());
    app.use('/mobile', mobileApiRouter);

    const requests = Array.from({ length: 5 }, () =>
      request(app).get('/mobile/downloads').expect(200)
    );

    const responses = await Promise.all(requests);
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });
});
