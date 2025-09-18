# TDD Implementation Plan for Offlinio

## Test-Driven Development Strategy

This document outlines the specific TDD approach for implementing the Offlinio Stremio addon, ensuring high code quality and reliable functionality.

## Phase 1: Foundation Setup (Week 1-2)

### 1.1 Testing Infrastructure
```bash
# Test framework setup
npm install --save-dev jest @types/jest
npm install --save-dev supertest # API testing
npm install --save-dev @testing-library/react # UI testing
npm install --save-dev puppeteer # E2E testing
```

**TDD Tasks:**
1. **Write test for project structure validation**
   - Test: Verify required directories exist
   - Implementation: Create directory structure
   
2. **Write test for configuration loading**
   - Test: Validate config file parsing
   - Implementation: Config management system

3. **Write test for logging system**
   - Test: Verify log levels and output
   - Implementation: Winston/Pino logger setup

### 1.2 Core Addon Tests
```javascript
// tests/addon/manifest.test.js
describe('Addon Manifest', () => {
  test('should generate valid manifest.json', () => {
    const manifest = generateManifest();
    expect(manifest).toMatchSchema(manifestSchema);
    expect(manifest.id).toBe('community.offlinio');
  });
});
```

## Phase 2: Stremio Addon Core (Week 3-4)

### 2.1 Manifest Generation (TDD Cycle)

**Red Phase:**
```javascript
// tests/addon/manifest.test.js
describe('Manifest Generation', () => {
  test('should create valid Stremio manifest', async () => {
    const manifest = await createManifest();
    
    expect(manifest.id).toBe('community.offlinio');
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.name).toBe('Offlinio');
    expect(manifest.description).toContain('offline');
    expect(manifest.resources).toContain('catalog');
    expect(manifest.resources).toContain('stream');
    expect(manifest.types).toContain('movie');
    expect(manifest.types).toContain('series');
  });

  test('should include required catalogs', async () => {
    const manifest = await createManifest();
    
    expect(manifest.catalogs).toHaveLength(2);
    expect(manifest.catalogs[0].type).toBe('movie');
    expect(manifest.catalogs[1].type).toBe('series');
  });
});
```

**Green Phase:**
```javascript
// src/addon/manifest.js
function createManifest() {
  return {
    id: 'community.offlinio',
    version: '1.0.0',
    name: 'Offlinio',
    description: 'Offline downloads for Stremio',
    resources: ['catalog', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
      { type: 'movie', id: 'offlinio-movies' },
      { type: 'series', id: 'offlinio-series' }
    ]
  };
}
```

### 2.2 Catalog Endpoint (TDD Cycle)

**Red Phase:**
```javascript
// tests/addon/catalog.test.js
describe('Catalog Endpoint', () => {
  test('should return offline movies catalog', async () => {
    const response = await request(app)
      .get('/catalog/movie/offlinio-movies.json')
      .expect(200);

    expect(response.body.metas).toBeInstanceOf(Array);
    expect(response.body.metas.length).toBeGreaterThan(0);
    
    const firstMeta = response.body.metas[0];
    expect(firstMeta).toHaveProperty('id');
    expect(firstMeta).toHaveProperty('name');
    expect(firstMeta).toHaveProperty('type', 'movie');
  });

  test('should support pagination', async () => {
    const response = await request(app)
      .get('/catalog/movie/offlinio-movies/skip=10.json')
      .expect(200);

    expect(response.body.metas).toBeInstanceOf(Array);
  });
});
```

## Phase 3: Download Engine (Week 5-7)

### 3.1 Real-Debrid Integration (TDD Cycle)

**Red Phase:**
```javascript
// tests/downloader/real-debrid.test.js
describe('Real-Debrid Integration', () => {
  test('should add magnet link to Real-Debrid', async () => {
    const magnetLink = 'magnet:?xt=urn:btih:test-hash';
    const torrentId = await addMagnetToRealDebrid(magnetLink);
    
    expect(torrentId).toBeDefined();
    expect(typeof torrentId).toBe('string');
  });

  test('should get torrent information from Real-Debrid', async () => {
    const torrentId = 'test-torrent-id';
    const info = await getTorrentInfo(torrentId);
    
    expect(info).toHaveProperty('status');
    expect(info).toHaveProperty('files');
    expect(info.files).toBeInstanceOf(Array);
  });

  test('should get direct download link', async () => {
    const realDebridLink = 'https://real-debrid.com/d/abc123';
    const directLink = await getDirectDownloadLink(realDebridLink);
    
    expect(directLink).toMatch(/^https?:\/\//);
  });
});
```

**Green Phase:**
```javascript
// src/downloader/real-debrid-service.js
class RealDebridService {
  async addMagnetToRealDebrid(magnetLink) {
    // Implementation using Real-Debrid API
  }

  async getTorrentInfo(torrentId) {
    // Implementation
  }

  async getDirectDownloadLink(link) {
    // Implementation
  }
}
```

### 3.2 Stream Capture (TDD Cycle)

**Red Phase:**
```javascript
// tests/downloader/stream-capture.test.js
describe('Stream Capture', () => {
  test('should capture stream using FFmpeg', async () => {
    const streamUrl = 'https://stream.example.com/movie.mkv';
    const outputPath = '/downloads/movie.mkv';
    
    const result = await captureStream(streamUrl, outputPath);
    
    expect(result).toBe(outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  test('should get stream information', async () => {
    const streamUrl = 'https://stream.example.com/movie.mkv';
    const info = await getStreamInfo(streamUrl);
    
    expect(info).toHaveProperty('format');
    expect(info).toHaveProperty('streams');
    expect(info.format).toHaveProperty('duration');
  });
});
```

### 3.2 Progress Tracking (TDD Cycle)

**Red Phase:**
```javascript
// tests/downloader/progress.test.js
describe('Download Progress Tracking', () => {
  test('should emit progress events', (done) => {
    const downloader = new DownloadManager();
    
    downloader.on('progress', (data) => {
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('progress');
      expect(data.progress).toBeGreaterThanOrEqual(0);
      expect(data.progress).toBeLessThanOrEqual(100);
      done();
    });

    downloader.startDownload('test-hash');
  });

  test('should persist progress to database', async () => {
    const download = await startDownload('test-hash');
    
    // Simulate progress
    await updateProgress(download.id, 50);
    
    const stored = await getDownloadFromDB(download.id);
    expect(stored.progress).toBe(50);
  });
});
```

## Phase 4: Storage System (Week 8-9)

### 4.1 File Storage (TDD Cycle)

**Red Phase:**
```javascript
// tests/storage/file-manager.test.js
describe('File Storage Manager', () => {
  test('should store file with metadata', async () => {
    const fileData = Buffer.from('test content');
    const metadata = { 
      title: 'Test Movie',
      imdbId: 'tt1234567',
      type: 'movie'
    };

    const stored = await storeFile(fileData, metadata);
    
    expect(stored).toHaveProperty('id');
    expect(stored).toHaveProperty('path');
    expect(stored.metadata).toEqual(metadata);
  });

  test('should verify file integrity', async () => {
    const fileData = Buffer.from('test content');
    const stored = await storeFile(fileData, {});
    
    const isValid = await verifyFileIntegrity(stored.id);
    expect(isValid).toBe(true);
  });

  test('should handle storage cleanup', async () => {
    await storeFile(Buffer.from('test'), {});
    const initialCount = await getFileCount();
    
    await cleanupOldFiles(0); // Remove all files
    const finalCount = await getFileCount();
    
    expect(finalCount).toBeLessThan(initialCount);
  });
});
```

## Phase 5: User Interface (Week 10-11)

### 5.1 React Components (TDD Cycle)

**Red Phase:**
```javascript
// tests/ui/DownloadQueue.test.jsx
import { render, screen } from '@testing-library/react';
import DownloadQueue from '../src/ui/components/DownloadQueue';

describe('Download Queue Component', () => {
  test('should render download items', () => {
    const downloads = [
      { id: '1', title: 'Movie 1', progress: 50, status: 'downloading' },
      { id: '2', title: 'Movie 2', progress: 100, status: 'completed' }
    ];

    render(<DownloadQueue downloads={downloads} />);
    
    expect(screen.getByText('Movie 1')).toBeInTheDocument();
    expect(screen.getByText('Movie 2')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  test('should handle pause/resume actions', async () => {
    const mockPause = jest.fn();
    const downloads = [
      { id: '1', title: 'Movie 1', progress: 50, status: 'downloading' }
    ];

    render(<DownloadQueue downloads={downloads} onPause={mockPause} />);
    
    const pauseButton = screen.getByRole('button', { name: /pause/i });
    await userEvent.click(pauseButton);
    
    expect(mockPause).toHaveBeenCalledWith('1');
  });
});
```

## Phase 6: Integration & E2E Testing (Week 12)

### 6.1 End-to-End Tests

**Red Phase:**
```javascript
// tests/e2e/complete-workflow.test.js
describe('Complete Download Workflow', () => {
  test('should complete full download cycle', async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Navigate to addon
    await page.goto('http://localhost:3000');
    
    // Add download
    await page.click('#add-download');
    await page.type('#torrent-input', 'magnet:?xt=urn:btih:test');
    await page.click('#start-download');
    
    // Verify download appears in queue
    await page.waitForSelector('.download-item');
    const downloadTitle = await page.$eval('.download-title', el => el.textContent);
    expect(downloadTitle).toBeTruthy();
    
    await browser.close();
  });
});
```

## TDD Best Practices for Offlinio

### 1. Test Categories
- **Unit Tests**: Individual functions/classes
- **Integration Tests**: Component interactions
- **E2E Tests**: Complete user workflows
- **Performance Tests**: Load and stress testing

### 2. Test Organization
```
tests/
├── unit/
│   ├── addon/
│   ├── downloader/
│   └── storage/
├── integration/
│   ├── api/
│   └── database/
├── e2e/
│   └── workflows/
└── fixtures/
    ├── torrents/
    └── metadata/
```

### 3. Mock Strategy
- Mock external APIs (TMDB, torrent trackers)
- Mock file system operations
- Mock network requests
- Use dependency injection for testability

### 4. Coverage Goals
- **Unit Tests**: 95%+ coverage
- **Integration Tests**: All critical paths
- **E2E Tests**: Main user workflows
- **Performance Tests**: Key bottlenecks

### 5. Continuous Testing
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
      - run: npm run test:coverage
      - run: npm run test:e2e
```

This TDD approach ensures that Offlinio is built with reliability, maintainability, and comprehensive test coverage from the ground up.
