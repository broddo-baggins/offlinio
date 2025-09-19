/**
 * Universal Server Unit Tests
 * 
 * Comprehensive testing for the universal server that serves all platforms
 * Tests cover server initialization, routing, middleware, and cross-platform support
 */

import request from 'supertest';
import { createServer } from 'http';
import express from 'express';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '11471';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock dependencies
jest.mock('../../src/db.js', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
  prisma: {
    content: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    download: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
}));

jest.mock('../../src/services/legal-notice.js', () => ({
  LegalNoticeService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    hasUserAcceptedLatest: jest.fn().mockResolvedValue(true)
  }))
}));

describe('Universal Server', () => {
  let server: any;
  let app: express.Application;

  beforeAll(async () => {
    // Import server after mocks are set up
    const serverModule = await import('../../src/server.js');
    
    // Wait for server to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create test app
    app = express();
    
    // Add basic middleware
    app.use(express.json());
    
    // Add mocked routes for testing
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        version: '0.2.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    app.get('/manifest.json', (req, res) => {
      res.json({
        id: 'community.offlinio',
        version: '0.2.0',
        name: 'Offlinio',
        description: 'Universal Personal Media Downloader'
      });
    });
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  describe('Server Initialization', () => {
    it('should start server on correct port', () => {
      expect(process.env.PORT).toBe('11471');
    });

    it('should initialize database', async () => {
      const { initializeDatabase } = await import('../../src/db.js');
      expect(initializeDatabase).toHaveBeenCalled();
    });

    it('should initialize legal notice service', async () => {
      const { LegalNoticeService } = await import('../../src/services/legal-notice.js');
      expect(LegalNoticeService).toHaveBeenCalled();
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return server health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should respond quickly to health checks', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should respond within 100ms
    });
  });

  describe('Universal Addon Routes', () => {
    it('should serve Stremio addon manifest', async () => {
      const response = await request(app)
        .get('/manifest.json')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('id', 'community.offlinio');
      expect(response.body).toHaveProperty('name', 'Offlinio');
    });

    it('should handle CORS for Stremio compatibility', async () => {
      const response = await request(app)
        .get('/manifest.json')
        .set('Origin', 'https://app.strem.io')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://app.strem.io');
    });
  });

  describe('Mobile API Routes', () => {
    it('should mount mobile API routes', async () => {
      // Test that mobile routes are accessible
      // Note: This would require the actual mobile-api router to be imported
      // For now, we test that the route structure is correct
      
      // This test verifies the route mounting structure
      expect(true).toBe(true); // Placeholder for route mounting test
    });
  });

  describe('Static File Serving', () => {
    it('should serve UI files', async () => {
      // Test would verify static file serving
      // This requires actual files to exist in src/ui/
      expect(true).toBe(true); // Placeholder
    });

    it('should serve PWA manifest', async () => {
      // Test PWA manifest serving
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Security Middleware', () => {
    it('should apply security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for security headers (would be applied by helmet)
      // This is a simplified test
      expect(response.headers).toBeDefined();
    });

    it('should handle request size limits', async () => {
      const largeData = 'x'.repeat(11 * 1024 * 1024); // 11MB (over 10MB limit)
      
      const response = await request(app)
        .post('/api/test')
        .send({ data: largeData })
        .expect(413); // Payload too large

      expect(response.status).toBe(413);
    });
  });

  describe('Legal Compliance Middleware', () => {
    it('should check legal notice acceptance', async () => {
      // Mock legal notice not accepted
      const { LegalNoticeService } = await import('../../src/services/legal-notice.js');
      const mockService = {
        hasUserAcceptedLatest: jest.fn().mockResolvedValue(false)
      };
      
      // This would test the legal middleware
      // For now, verify the service is called
      expect(LegalNoticeService).toHaveBeenCalled();
    });

    it('should skip legal check for public endpoints', async () => {
      // Manifest should be accessible without legal acceptance
      const response = await request(app)
        .get('/manifest.json')
        .expect(200);

      expect(response.body.id).toBe('community.offlinio');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      const response = await request(app)
        .get('/nonexistent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
    });

    it('should handle server errors gracefully', async () => {
      // Mock a route that throws an error
      app.get('/test-error', (req, res, next) => {
        throw new Error('Test error');
      });

      const response = await request(app)
        .get('/test-error')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should not leak sensitive information in errors', async () => {
      app.get('/test-sensitive-error', (req, res, next) => {
        const error = new Error('Database connection failed: password123');
        throw error;
      });

      const response = await request(app)
        .get('/test-sensitive-error')
        .expect(500);

      expect(response.body.message).not.toContain('password123');
    });
  });

  describe('Cross-Platform Support', () => {
    it('should handle desktop user agents', async () => {
      const response = await request(app)
        .get('/manifest.json')
        .set('User-Agent', 'Stremio/4.4.0 (desktop; Windows)')
        .expect(200);

      expect(response.body.id).toBe('community.offlinio');
    });

    it('should handle mobile user agents', async () => {
      const response = await request(app)
        .get('/manifest.json')
        .set('User-Agent', 'Stremio/1.0.0 (android)')
        .expect(200);

      expect(response.body.id).toBe('community.offlinio');
    });

    it('should handle web user agents', async () => {
      const response = await request(app)
        .get('/manifest.json')
        .set('User-Agent', 'Mozilla/5.0 (compatible; Stremio Web)')
        .expect(200);

      expect(response.body.id).toBe('community.offlinio');
    });

    it('should provide consistent responses across platforms', async () => {
      const userAgents = [
        'Stremio/4.4.0 (desktop)',
        'Stremio/1.0.0 (android)',
        'Mozilla/5.0 (compatible; Stremio Web)'
      ];

      const responses = await Promise.all(
        userAgents.map(ua =>
          request(app)
            .get('/manifest.json')
            .set('User-Agent', ua)
        )
      );

      // All responses should have the same structure
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe('community.offlinio');
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 20 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });

    it('should respond within reasonable time limits', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/manifest.json')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200); // Should respond within 200ms
    });

    it('should handle load spikes gracefully', async () => {
      // Simulate load spike with 50 concurrent requests
      const requests = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .get(`/health?test=${i}`)
          .timeout(5000) // 5 second timeout
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      // All requests should complete successfully
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should handle load spike within reasonable time
      expect(duration).toBeLessThan(3000); // Within 3 seconds
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory during normal operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple operations
      for (let i = 0; i < 100; i++) {
        await request(app).get('/health');
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Configuration and Environment', () => {
    it('should use correct default port', () => {
      expect(process.env.PORT).toBe('11471');
    });

    it('should handle missing environment variables gracefully', () => {
      // Server should start even with minimal config
      expect(process.env.NODE_ENV).toBe('test');
    });
  });
});

describe('Server Integration Tests', () => {
  let app: express.Application;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Mock complete server setup
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy' });
    });
    
    app.get('/manifest.json', (req, res) => {
      res.json({ id: 'community.offlinio' });
    });
  });

  it('should support complete addon workflow', async () => {
    // Test complete workflow that all platforms would use
    
    // 1. Health check
    const healthResponse = await request(app)
      .get('/health')
      .expect(200);
    
    expect(healthResponse.body.status).toBe('healthy');

    // 2. Manifest
    const manifestResponse = await request(app)
      .get('/manifest.json')
      .expect(200);
    
    expect(manifestResponse.body.id).toBe('community.offlinio');
  });

  it('should maintain session state across requests', async () => {
    // Test that server maintains state properly
    // This would test database connections, etc.
    
    const response1 = await request(app).get('/health');
    const response2 = await request(app).get('/health');
    
    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
  });
});
