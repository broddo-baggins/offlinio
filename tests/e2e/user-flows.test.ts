/**
 * User Flow End-to-End Tests
 * 
 * Validates complete user journeys:
 * - Plugin discovery and installation
 * - Content download and consumption  
 * - Library management and offline access
 * - Notification system functionality
 */

import { test, expect } from '@playwright/test';

test.describe('User Flow: Plugin Installation & Management', () => {
  test('user can discover and install addon in Stremio', async ({ page, request }) => {
    // Validate addon is discoverable via manifest
    const manifestResponse = await request.get('/manifest.json');
    expect(manifestResponse.status()).toBe(200);
    
    const manifest = await manifestResponse.json();
    expect(manifest.id).toBe('community.offlinio');
    expect(manifest.name).toBe('Offlinio');
    
    // Validate addon provides required resources
    expect(manifest.resources).toContain('catalog');
    expect(manifest.resources).toContain('stream');
    expect(manifest.resources).toContain('meta');
    
    // Validate addon supports required content types
    expect(manifest.types).toContain('movie');
    expect(manifest.types).toContain('series');
    
    // Validate catalog structure is ready for Stremio
    expect(manifest.catalogs).toHaveLength(2);
    expect(manifest.catalogs[0].name).toBe('Downloaded Movies');
    expect(manifest.catalogs[1].name).toBe('Downloaded Series');
  });

  test('addon endpoints remain accessible after installation', async ({ request }) => {
    // Test all critical endpoints that Stremio will call
    const endpoints = [
      '/manifest.json',
      '/catalog/movie/offlinio-movies.json',
      '/catalog/series/offlinio-series.json',
      '/stream/movie/tt0111161.json',
      '/meta/series/tt0903747.json'
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toBeDefined();
      
      // Validate response structure based on endpoint type
      if (endpoint.includes('/catalog/')) {
        expect(data).toHaveProperty('metas');
        expect(Array.isArray(data.metas)).toBe(true);
      } else if (endpoint.includes('/stream/')) {
        expect(data).toHaveProperty('streams');
        expect(Array.isArray(data.streams)).toBe(true);
      } else if (endpoint.includes('/meta/')) {
        expect(data).toHaveProperty('meta');
      }
    }
  });
});

test.describe('User Flow: Content Download & Consumption', () => {
  test('user can trigger download from Stremio interface', async ({ request }) => {
    // Simulate user clicking download trigger in Stremio
    const streamResponse = await request.get('/stream/movie/tt0111161.json');
    expect(streamResponse.status()).toBe(200);
    
    const streamData = await streamResponse.json();
    expect(streamData.streams).toBeDefined();
    
    // Find download trigger stream
    const downloadStream = streamData.streams.find((stream: any) => 
      stream.name && stream.name.includes('Download for Offline')
    );
    
    expect(downloadStream).toBeDefined();
    expect(downloadStream.name).toBe('📥 Download for Offline');
    expect(downloadStream.title).toBe('Download this content to your device');
    expect(downloadStream.url).toMatch(/^http:\/\/127\.0\.0\.1:11471\/download\//);
  });

  test('download trigger initiates proper workflow', async ({ request }) => {
    // Test download endpoint activation
    const downloadUrl = '/download/tt0111161'; // The Shawshank Redemption
    const downloadResponse = await request.get(downloadUrl);
    
    // Should either start download (200) or provide status (202 for async)
    expect([200, 202, 400]).toContain(downloadResponse.status());
    
    if (downloadResponse.status() === 200) {
      const result = await downloadResponse.json();
      expect(result).toHaveProperty('status');
    }
  });

  test('downloaded content appears in catalog', async ({ request }) => {
    // Check if downloaded content shows up in appropriate catalog
    const catalogResponse = await request.get('/catalog/movie/offlinio-movies.json');
    expect(catalogResponse.status()).toBe(200);
    
    const catalog = await catalogResponse.json();
    expect(catalog.metas).toBeDefined();
    
    // If content exists, validate structure
    if (catalog.metas.length > 0) {
      const meta = catalog.metas[0];
      expect(meta).toHaveProperty('id');
      expect(meta).toHaveProperty('type', 'movie');
      expect(meta).toHaveProperty('name');
      
      // Optional properties that enhance user experience
      if (meta.poster) expect(meta.poster).toMatch(/^https?:\/\//);
      if (meta.year) expect(typeof meta.year).toBe('number');
    }
  });
});

test.describe('User Flow: Library Management', () => {
  test('user can browse offline content catalogs', async ({ request }) => {
    // Test both movie and series catalogs
    const catalogs = [
      { endpoint: '/catalog/movie/offlinio-movies.json', type: 'movie' },
      { endpoint: '/catalog/series/offlinio-series.json', type: 'series' }
    ];

    for (const catalog of catalogs) {
      const response = await request.get(catalog.endpoint);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.metas).toBeDefined();
      expect(Array.isArray(data.metas)).toBe(true);
      
      // Validate meta objects if content exists
      for (const meta of data.metas) {
        expect(meta.type).toBe(catalog.type);
        expect(meta.id).toBeDefined();
        expect(meta.name).toBeDefined();
      }
    }
  });

  test('user can search downloaded content', async ({ request }) => {
    // Test search functionality in catalog
    const searchQuery = 'shawshank';
    const searchResponse = await request.get(
      `/catalog/movie/offlinio-movies.json?search=${encodeURIComponent(searchQuery)}`
    );
    
    expect(searchResponse.status()).toBe(200);
    
    const searchResults = await searchResponse.json();
    expect(searchResults.metas).toBeDefined();
    
    // If results exist, they should match search criteria
    for (const meta of searchResults.metas) {
      const matchesSearch = meta.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           meta.description?.toLowerCase().includes(searchQuery.toLowerCase());
      expect(matchesSearch).toBe(true);
    }
  });

  test('user can access series episode information', async ({ request }) => {
    // Test series meta endpoint for episode information
    const seriesId = 'tt0903747'; // Breaking Bad
    const metaResponse = await request.get(`/meta/series/${seriesId}.json`);
    
    expect(metaResponse.status()).toBe(200);
    
    const metaData = await metaResponse.json();
    expect(metaData.meta).toBeDefined();
    
    const meta = metaData.meta;
    if (meta.videos && meta.videos.length > 0) {
      const episode = meta.videos[0];
      expect(episode).toHaveProperty('id');
      expect(episode).toHaveProperty('title');
      expect(episode).toHaveProperty('season');
      expect(episode).toHaveProperty('episode');
    }
  });
});

test.describe('User Flow: Error Handling & Recovery', () => {
  test('system gracefully handles invalid content requests', async ({ request }) => {
    // Test invalid movie ID
    const invalidMovieResponse = await request.get('/stream/movie/invalid-id.json');
    expect(invalidMovieResponse.status()).toBe(200); // Should return empty streams, not error
    
    const movieData = await invalidMovieResponse.json();
    expect(movieData.streams).toBeDefined();
    expect(Array.isArray(movieData.streams)).toBe(true);
  });

  test('system provides helpful error messages', async ({ request }) => {
    // Test non-existent catalog
    const invalidCatalogResponse = await request.get('/catalog/invalid/test.json');
    expect([404, 500]).toContain(invalidCatalogResponse.status());
    
    if (invalidCatalogResponse.status() === 500) {
      const errorData = await invalidCatalogResponse.json();
      expect(errorData.error).toBeDefined();
    }
  });

  test('download system handles Real-Debrid authentication issues', async ({ request }) => {
    // Test download trigger with potential auth issues
    const downloadResponse = await request.get('/download/tt0111161');
    
    if (downloadResponse.status() === 400 || downloadResponse.status() === 401) {
      const errorData = await downloadResponse.json();
      expect(errorData.error).toBeDefined();
      expect(errorData.error).toMatch(/token|auth|debrid/i);
    }
  });
});

test.describe('User Flow: Performance & Responsiveness', () => {
  test('catalog endpoints respond within acceptable time limits', async ({ request }) => {
    const startTime = Date.now();
    
    const catalogResponse = await request.get('/catalog/movie/offlinio-movies.json');
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(500); // 500ms SLA
    
    expect(catalogResponse.status()).toBe(200);
  });

  test('manifest endpoint has minimal response time', async ({ request }) => {
    const startTime = Date.now();
    
    const manifestResponse = await request.get('/manifest.json');
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(100); // 100ms SLA for manifest
    
    expect(manifestResponse.status()).toBe(200);
  });

  test('stream endpoints respond quickly for user experience', async ({ request }) => {
    const startTime = Date.now();
    
    const streamResponse = await request.get('/stream/movie/tt0111161.json');
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(200); // 200ms SLA for streams
    
    expect(streamResponse.status()).toBe(200);
  });
});

test.describe('User Flow: Cross-Platform Compatibility', () => {
  test('CORS headers allow Stremio Web access', async ({ request }) => {
    // Test CORS headers for web version compatibility
    const corsResponse = await request.fetch('/manifest.json', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://app.strem.io',
        'Access-Control-Request-Method': 'GET'
      }
    });

    expect([200, 204]).toContain(corsResponse.status());
  });

  test('addon works with Stremio user agent strings', async ({ request }) => {
    // Test with Stremio-like user agent
    const stremioUserAgent = 'Stremio/4.4.0 (Windows NT 10.0; Win64; x64)';
    
    const manifestResponse = await request.get('/manifest.json', {
      headers: {
        'User-Agent': stremioUserAgent
      }
    });

    expect(manifestResponse.status()).toBe(200);
    
    const manifest = await manifestResponse.json();
    expect(manifest.id).toBe('community.offlinio');
  });
});

test.describe('User Flow: Security & Privacy', () => {
  test('sensitive endpoints are properly protected', async ({ request }) => {
    // Test that API endpoints requiring auth are protected
    const sensitiveEndpoints = [
      '/api/downloads/queue',
      '/api/downloads/settings'
    ];

    for (const endpoint of sensitiveEndpoints) {
      const response = await request.get(endpoint);
      // Should either require auth (401/403) or legal acceptance (451)
      expect([401, 403, 451]).toContain(response.status());
    }
  });

  test('file server prevents path traversal attacks', async ({ request }) => {
    // Test path traversal protection
    const maliciousPaths = [
      '/files/../../../etc/passwd',
      '/files/..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '/files/%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
    ];

    for (const path of maliciousPaths) {
      const response = await request.get(path);
      expect([403, 404]).toContain(response.status());
    }
  });
});
