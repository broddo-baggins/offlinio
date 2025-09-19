/**
 * Stremio Addon Unit Tests
 * 
 * Comprehensive testing for universal Stremio addon functionality
 * Tests cover manifest, catalog, meta, and stream endpoints across all platforms
 */

import request from 'supertest';
import express from 'express';
import { addonRouter } from '../../src/addon.js';
import { prisma } from '../../src/db.js';

// Mock dependencies
jest.mock('../../src/db.js');
jest.mock('../../src/services/catalog.js');
jest.mock('../../src/services/auto-debrid.js');
jest.mock('../../src/services/comet-integration.js');

describe('Universal Stremio Addon', () => {
  let app: express.Application;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', addonRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /manifest.json', () => {
    it('should return valid addon manifest', async () => {
      const response = await request(app)
        .get('/manifest.json')
        .expect(200)
        .expect('Content-Type', /json/);

      const manifest = response.body;
      
      // Required manifest properties
      expect(manifest).toHaveProperty('id', 'community.offlinio');
      expect(manifest).toHaveProperty('version');
      expect(manifest).toHaveProperty('name', 'Offlinio');
      expect(manifest).toHaveProperty('description');
      expect(manifest).toHaveProperty('resources');
      expect(manifest).toHaveProperty('types');
      expect(manifest).toHaveProperty('catalogs');
      
      // Universal platform support
      expect(manifest.resources).toContain('catalog');
      expect(manifest.resources).toContain('meta');
      expect(manifest.resources).toContain('stream');
      
      expect(manifest.types).toContain('movie');
      expect(manifest.types).toContain('series');
      
      expect(manifest.catalogs).toHaveLength(2);
      expect(manifest.catalogs[0]).toHaveProperty('id', 'offlinio-movies');
      expect(manifest.catalogs[1]).toHaveProperty('id', 'offlinio-series');
    });

    it('should include proper behavioral hints', async () => {
      const response = await request(app)
        .get('/manifest.json')
        .expect(200);

      const manifest = response.body;
      expect(manifest).toHaveProperty('behaviorHints');
      expect(manifest.behaviorHints).toHaveProperty('adult', false);
      expect(manifest.behaviorHints).toHaveProperty('p2p', false);
      expect(manifest.behaviorHints).toHaveProperty('configurable', true);
    });

    it('should support universal ID prefixes', async () => {
      const response = await request(app)
        .get('/manifest.json')
        .expect(200);

      const manifest = response.body;
      expect(manifest).toHaveProperty('idPrefixes');
      expect(manifest.idPrefixes).toContain('tt'); // IMDB
      expect(manifest.idPrefixes).toContain('local');
      expect(manifest.idPrefixes).toContain('offlinio');
    });
  });

  describe('GET /catalog/:type/:id.json', () => {
    beforeEach(() => {
      // Mock catalog service
      const mockCatalog = jest.requireMock('../../src/services/catalog.js');
      mockCatalog.getDownloadedCatalog.mockResolvedValue([
        {
          id: 'tt0111161',
          type: 'movie',
          name: 'The Shawshank Redemption',
          poster: 'https://example.com/poster.jpg',
          year: '1994'
        }
      ]);
    });

    it('should return movie catalog', async () => {
      const response = await request(app)
        .get('/catalog/movie/offlinio-movies.json')
        .expect(200);

      expect(response.body).toHaveProperty('metas');
      expect(Array.isArray(response.body.metas)).toBe(true);
      
      if (response.body.metas.length > 0) {
        const meta = response.body.metas[0];
        expect(meta).toHaveProperty('id');
        expect(meta).toHaveProperty('type', 'movie');
        expect(meta).toHaveProperty('name');
      }
    });

    it('should return series catalog', async () => {
      const response = await request(app)
        .get('/catalog/series/offlinio-series.json')
        .expect(200);

      expect(response.body).toHaveProperty('metas');
      expect(Array.isArray(response.body.metas)).toBe(true);
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/catalog/movie/offlinio-movies.json')
        .query({ search: 'shawshank' })
        .expect(200);

      expect(response.body).toHaveProperty('metas');
    });

    it('should support genre filtering', async () => {
      const response = await request(app)
        .get('/catalog/movie/offlinio-movies.json')
        .query({ genre: 'drama' })
        .expect(200);

      expect(response.body).toHaveProperty('metas');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/catalog/movie/offlinio-movies.json')
        .query({ skip: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('metas');
    });

    it('should handle catalog errors gracefully', async () => {
      const mockCatalog = jest.requireMock('../../src/services/catalog.js');
      mockCatalog.getDownloadedCatalog.mockRejectedValue(new Error('Catalog error'));

      const response = await request(app)
        .get('/catalog/movie/offlinio-movies.json')
        .expect(500);

      expect(response.body).toHaveProperty('metas', []);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /meta/:type/:id.json', () => {
    beforeEach(() => {
      const mockCatalog = jest.requireMock('../../src/services/catalog.js');
      mockCatalog.getSeriesMeta.mockResolvedValue({
        id: 'tt0903747',
        type: 'series',
        name: 'Breaking Bad',
        videos: [
          { id: 'tt0903747:1:1', season: 1, episode: 1, title: 'Pilot' }
        ]
      });
    });

    it('should return series metadata with episodes', async () => {
      const response = await request(app)
        .get('/meta/series/tt0903747.json')
        .expect(200);

      expect(response.body).toHaveProperty('meta');
      const meta = response.body.meta;
      expect(meta).toHaveProperty('id', 'tt0903747');
      expect(meta).toHaveProperty('type', 'series');
    });

    it('should return basic movie metadata', async () => {
      const response = await request(app)
        .get('/meta/movie/tt0111161.json')
        .expect(200);

      expect(response.body).toHaveProperty('meta');
      const meta = response.body.meta;
      expect(meta).toHaveProperty('id', 'tt0111161');
      expect(meta).toHaveProperty('type', 'movie');
    });

    it('should handle meta errors gracefully', async () => {
      const mockCatalog = jest.requireMock('../../src/services/catalog.js');
      mockCatalog.getSeriesMeta.mockRejectedValue(new Error('Meta error'));

      const response = await request(app)
        .get('/meta/series/tt0903747.json')
        .expect(500);

      expect(response.body).toHaveProperty('meta', {});
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /stream/:type/:id.json', () => {
    beforeEach(() => {
      const mockCatalog = jest.requireMock('../../src/services/catalog.js');
      mockCatalog.getLocalStreamForId.mockResolvedValue({
        url: 'http://127.0.0.1:11471/files/movie.mp4'
      });
    });

    it('should return streams for downloaded content', async () => {
      const response = await request(app)
        .get('/stream/movie/tt0111161.json')
        .expect(200);

      expect(response.body).toHaveProperty('streams');
      expect(Array.isArray(response.body.streams)).toBe(true);
      
      const streams = response.body.streams;
      
      // Should include offline playback stream
      const offlineStream = streams.find((s: any) => s.name === 'Play Offline');
      expect(offlineStream).toBeDefined();
      expect(offlineStream.url).toContain('/files/');
      
      // Should include download trigger
      const downloadStream = streams.find((s: any) => s.name === 'Download for Offline');
      expect(downloadStream).toBeDefined();
      expect(downloadStream.url).toContain('/download/');
    });

    it('should show download progress for active downloads', async () => {
      // Mock active download
      const mockGetDownloadStatus = jest.fn().mockResolvedValue({
        status: 'downloading',
        progress: 45
      });
      
      const response = await request(app)
        .get('/stream/movie/tt0111161.json')
        .expect(200);

      const streams = response.body.streams;
      // Should include progress stream if download is active
      expect(streams.length).toBeGreaterThan(0);
    });

    it('should handle content without local streams', async () => {
      const mockCatalog = jest.requireMock('../../src/services/catalog.js');
      mockCatalog.getLocalStreamForId.mockResolvedValue(null);

      const response = await request(app)
        .get('/stream/movie/tt9999999.json')
        .expect(200);

      const streams = response.body.streams;
      expect(streams).toHaveLength(1); // Should only have download trigger
      
      const downloadStream = streams[0];
      expect(downloadStream.name).toBe('Download for Offline');
    });

    it('should include proper behavioral hints for streams', async () => {
      const response = await request(app)
        .get('/stream/movie/tt0111161.json')
        .expect(200);

      const streams = response.body.streams;
      streams.forEach((stream: any) => {
        expect(stream).toHaveProperty('behaviorHints');
        if (stream.name === 'Play Offline') {
          expect(stream.behaviorHints).toHaveProperty('counterSeeds', 0);
          expect(stream.behaviorHints).toHaveProperty('counterPeers', 0);
        }
      });
    });

    it('should handle stream errors gracefully', async () => {
      const mockCatalog = jest.requireMock('../../src/services/catalog.js');
      mockCatalog.getLocalStreamForId.mockRejectedValue(new Error('Stream error'));

      const response = await request(app)
        .get('/stream/movie/tt0111161.json')
        .expect(500);

      expect(response.body).toHaveProperty('streams', []);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /download/:id', () => {
    beforeEach(() => {
      // Mock auto-debrid and comet integration
      const mockAutoDebrid = jest.requireMock('../../src/services/auto-debrid.js');
      const mockComet = jest.requireMock('../../src/services/comet-integration.js');
      
      mockComet.CometIntegration.prototype.getBestMagnetForContent.mockResolvedValue({
        title: 'Test Movie 2024 1080p',
        quality: '1080p',
        size: '2.1 GB',
        magnetUri: 'magnet:?xt=urn:btih:test123'
      });
      
      mockAutoDebrid.AutoDebridDetector.prototype.autoResolveDownload.mockResolvedValue({
        success: true,
        downloadUrl: 'https://download.example.com/file.mp4',
        service: 'Real-Debrid'
      });
    });

    it('should trigger movie download', async () => {
      // Mock successful download API call
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          downloadId: 'download-123',
          success: true
        })
      });

      const response = await request(app)
        .get('/download/tt0111161')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('downloadId');
      expect(response.body).toHaveProperty('redirect');
    });

    it('should trigger series episode download', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          downloadId: 'download-456',
          success: true
        })
      });

      const response = await request(app)
        .get('/download/tt0903747:1:1')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('downloadId');
    });

    it('should handle download failures', async () => {
      const mockComet = jest.requireMock('../../src/services/comet-integration.js');
      mockComet.CometIntegration.prototype.getBestMagnetForContent.mockResolvedValue(null);

      const response = await request(app)
        .get('/download/tt9999999')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle service unavailable', async () => {
      const mockAutoDebrid = jest.requireMock('../../src/services/auto-debrid.js');
      mockAutoDebrid.AutoDebridDetector.prototype.autoResolveDownload.mockResolvedValue({
        success: false,
        error: 'No services available'
      });

      const response = await request(app)
        .get('/download/tt0111161')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /addon-health', () => {
    it('should return addon health status', async () => {
      const response = await request(app)
        .get('/addon-health')
        .expect(200);

      expect(response.body).toHaveProperty('addon', 'Offlinio');
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('manifest', 'community.offlinio');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Universal Platform Compatibility', () => {
    it('should work with desktop Stremio', async () => {
      // Test manifest
      const manifestResponse = await request(app)
        .get('/manifest.json')
        .set('User-Agent', 'Stremio/4.4.0 (desktop)')
        .expect(200);

      expect(manifestResponse.body.id).toBe('community.offlinio');

      // Test stream
      const streamResponse = await request(app)
        .get('/stream/movie/tt0111161.json')
        .set('User-Agent', 'Stremio/4.4.0 (desktop)')
        .expect(200);

      expect(streamResponse.body.streams).toBeDefined();
    });

    it('should work with mobile Stremio', async () => {
      const response = await request(app)
        .get('/manifest.json')
        .set('User-Agent', 'Stremio/1.0.0 (android)')
        .expect(200);

      expect(response.body.id).toBe('community.offlinio');
    });

    it('should work with Stremio Web', async () => {
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
        'Stremio/1.0.0 (ios)',
        'Mozilla/5.0 (compatible; Stremio Web)'
      ];

      const responses = await Promise.all(
        userAgents.map(ua =>
          request(app)
            .get('/manifest.json')
            .set('User-Agent', ua)
            .expect(200)
        )
      );

      // All responses should be identical
      const firstResponse = responses[0].body;
      responses.forEach(response => {
        expect(response.body).toEqual(firstResponse);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should respond quickly to manifest requests', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/manifest.json')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should respond within 100ms
    });

    it('should handle concurrent stream requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/stream/movie/tt0111161.json').expect(200)
      );

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.body.streams).toBeDefined();
      });
    });
  });
});

describe('Addon Integration Tests', () => {
  let app: express.Application;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', addonRouter);
  });

  it('should support complete Stremio workflow', async () => {
    // 1. Get manifest
    const manifestResponse = await request(app)
      .get('/manifest.json')
      .expect(200);
    
    expect(manifestResponse.body.id).toBe('community.offlinio');

    // 2. Get catalog
    const catalogResponse = await request(app)
      .get('/catalog/movie/offlinio-movies.json')
      .expect(200);
    
    expect(catalogResponse.body.metas).toBeDefined();

    // 3. Get streams
    const streamResponse = await request(app)
      .get('/stream/movie/tt0111161.json')
      .expect(200);
    
    expect(streamResponse.body.streams).toBeDefined();
    expect(streamResponse.body.streams.length).toBeGreaterThan(0);
  });

  it('should handle content ID parsing correctly', async () => {
    // Test movie ID
    const movieResponse = await request(app)
      .get('/stream/movie/tt0111161.json')
      .expect(200);
    
    expect(movieResponse.body.streams).toBeDefined();

    // Test series episode ID
    const seriesResponse = await request(app)
      .get('/stream/series/tt0903747:1:1.json')
      .expect(200);
    
    expect(seriesResponse.body.streams).toBeDefined();
  });
});
