# Stremio Addon Testing Guide

## Stremio Addon Testing Framework

### 1. Official Stremio Testing Tools

#### Stremio Addon SDK
```bash
# Install Stremio Addon SDK
npm install -g stremio-addon-sdk

# Test addon locally
stremio-addon-sdk test http://localhost:3000/manifest.json

# Validate addon manifest
stremio-addon-sdk validate manifest.json

# Test addon with specific parameters
stremio-addon-sdk test http://localhost:3000/manifest.json --type=movie --id=tt1234567
```

#### Stremio Addon Testing Library
```bash
# Install testing dependencies
npm install --save-dev stremio-addon-sdk
npm install --save-dev supertest
npm install --save-dev nock
```

### 2. Local Development Testing

#### Stremio Desktop Client Testing
```bash
# 1. Start your addon server
npm run dev

# 2. Install addon in Stremio desktop client
# - Open Stremio
# - Go to Addons
# - Click "Add Addon"
# - Enter: http://localhost:3000/manifest.json

# 3. Test addon functionality
# - Browse catalog
# - Test stream resolution
# - Verify metadata display
```

#### Stremio Web Client Testing
```bash
# 1. Start addon server
npm run dev

# 2. Test in browser
# - Navigate to: https://app.strem.io/
# - Add addon: http://localhost:3000/manifest.json
# - Test functionality
```

### 3. Automated Testing Setup

#### Test Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ]
};
```

#### Test Setup
```javascript
// tests/setup.js
const { testAddon } = require('stremio-addon-sdk/test');

// Mock external services
jest.mock('../src/services/real-debrid');
jest.mock('../src/services/metadata');

// Global test utilities
global.testAddon = testAddon;
global.mockStremioRequest = (type, id, extra = {}) => ({
  type,
  id,
  extra
});
```

### 4. Addon Manifest Testing

#### Manifest Validation
```javascript
// tests/addon/manifest.test.js
const { validateManifest } = require('stremio-addon-sdk');

describe('Addon Manifest', () => {
  test('should have valid manifest structure', () => {
    const manifest = require('../../src/manifest.json');
    
    const validation = validateManifest(manifest);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('should include required fields', () => {
    const manifest = require('../../src/manifest.json');
    
    expect(manifest).toHaveProperty('id');
    expect(manifest).toHaveProperty('version');
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('description');
    expect(manifest).toHaveProperty('resources');
    expect(manifest).toHaveProperty('types');
  });

  test('should have correct addon ID', () => {
    const manifest = require('../../src/manifest.json');
    expect(manifest.id).toBe('community.offlinio');
  });
});
```

### 5. Catalog Endpoint Testing

#### Catalog Response Testing
```javascript
// tests/addon/catalog.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Catalog Endpoints', () => {
  test('should return movie catalog', async () => {
    const response = await request(app)
      .get('/catalog/movie/offlinio-movies.json')
      .expect(200);

    expect(response.body).toHaveProperty('metas');
    expect(Array.isArray(response.body.metas)).toBe(true);
    
    // Verify meta structure
    if (response.body.metas.length > 0) {
      const meta = response.body.metas[0];
      expect(meta).toHaveProperty('id');
      expect(meta).toHaveProperty('name');
      expect(meta).toHaveProperty('type');
      expect(meta.type).toBe('movie');
    }
  });

  test('should support catalog pagination', async () => {
    const response = await request(app)
      .get('/catalog/movie/offlinio-movies/skip=10.json')
      .expect(200);

    expect(response.body).toHaveProperty('metas');
    expect(Array.isArray(response.body.metas)).toBe(true);
  });

  test('should support catalog search', async () => {
    const response = await request(app)
      .get('/catalog/movie/offlinio-movies/search=test.json')
      .expect(200);

    expect(response.body).toHaveProperty('metas');
    expect(Array.isArray(response.body.metas)).toBe(true);
  });
});
```

### 6. Stream Endpoint Testing

#### Stream Resolution Testing
```javascript
// tests/addon/stream.test.js
describe('Stream Endpoints', () => {
  test('should resolve movie stream', async () => {
    const response = await request(app)
      .get('/stream/movie/tt1234567.json')
      .expect(200);

    expect(response.body).toHaveProperty('streams');
    expect(Array.isArray(response.body.streams)).toBe(true);
    
    if (response.body.streams.length > 0) {
      const stream = response.body.streams[0];
      expect(stream).toHaveProperty('url');
      expect(stream).toHaveProperty('title');
      expect(stream).toHaveProperty('behaviorHints');
    }
  });

  test('should resolve series stream', async () => {
    const response = await request(app)
      .get('/stream/series/tt1234567:1:1.json')
      .expect(200);

    expect(response.body).toHaveProperty('streams');
    expect(Array.isArray(response.body.streams)).toBe(true);
  });

  test('should handle stream errors gracefully', async () => {
    const response = await request(app)
      .get('/stream/movie/invalid-id.json')
      .expect(200);

    expect(response.body).toHaveProperty('streams');
    expect(response.body.streams).toHaveLength(0);
  });
});
```

### 7. Real-Debrid Integration Testing

#### Mock Real-Debrid API
```javascript
// tests/mocks/real-debrid-mock.js
const nock = require('nock');

const mockRealDebridAPI = () => {
  return nock('https://api.real-debrid.com')
    .post('/rest/1.0/torrents/addMagnet')
    .reply(200, { id: 'mock-torrent-123' })
    .get('/rest/1.0/torrents/info/mock-torrent-123')
    .reply(200, {
      id: 'mock-torrent-123',
      status: 'downloaded',
      files: [{ id: 0, path: 'movie.mkv', bytes: 1000000 }]
    })
    .post('/rest/1.0/unrestrict/link')
    .reply(200, { download: 'https://mock-download.com/file.mkv' });
};
```

#### Real-Debrid Service Testing
```javascript
// tests/services/real-debrid.test.js
describe('Real-Debrid Service', () => {
  beforeEach(() => {
    mockRealDebridAPI();
  });

  test('should add magnet link to Real-Debrid', async () => {
    const realDebridService = new RealDebridService('test-api-key');
    const magnetLink = 'magnet:?xt=urn:btih:test-hash';
    
    const result = await realDebridService.addMagnet(magnetLink);
    
    expect(result).toBe('mock-torrent-123');
  });

  test('should get torrent information', async () => {
    const realDebridService = new RealDebridService('test-api-key');
    const torrentId = 'mock-torrent-123';
    
    const result = await realDebridService.getTorrentInfo(torrentId);
    
    expect(result).toHaveProperty('status');
    expect(result.status).toBe('downloaded');
  });
});
```

### 8. End-to-End Testing

#### Complete Workflow Testing
```javascript
// tests/e2e/complete-workflow.test.js
const puppeteer = require('puppeteer');

describe('Complete Addon Workflow', () => {
  test('should complete download workflow', async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Navigate to addon
    await page.goto('http://localhost:3000');
    
    // Browse catalog
    await page.click('#catalog-tab');
    await page.waitForSelector('.catalog-item');
    
    // Select content
    await page.click('.catalog-item:first-child');
    
    // Start download
    await page.click('#download-button');
    await page.waitForSelector('.download-progress');
    
    // Verify download started
    const progress = await page.$eval('.download-progress', el => el.textContent);
    expect(progress).toContain('Downloading');
    
    await browser.close();
  });
});
```

### 9. Performance Testing

#### Load Testing
```javascript
// tests/performance/load.test.js
const autocannon = require('autocannon');

describe('Performance Tests', () => {
  test('should handle concurrent requests', async () => {
    const result = await autocannon({
      url: 'http://localhost:3000',
      connections: 10,
      duration: 10
    });

    expect(result.requests.total).toBeGreaterThan(0);
    expect(result.errors).toBe(0);
  });

  test('should respond within acceptable time', async () => {
    const start = Date.now();
    
    await request(app)
      .get('/catalog/movie/offlinio-movies.json')
      .expect(200);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // 1 second
  });
});
```

### 10. Testing Commands

#### Package.json Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "jest --config jest.e2e.config.js",
    "test:addon": "stremio-addon-sdk test http://localhost:3000/manifest.json",
    "test:manifest": "stremio-addon-sdk validate manifest.json"
  }
}
```

#### Test Execution
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Test addon with Stremio SDK
npm run test:addon

# Validate manifest
npm run test:manifest
```

### 11. Continuous Integration

#### GitHub Actions
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - run: npm run test:addon
```

This testing strategy ensures your Stremio addon works correctly with the Stremio ecosystem while maintaining high code quality and reliability.
