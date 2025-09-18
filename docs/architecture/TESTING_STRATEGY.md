# Stremio Addon Testing Strategy

## Stremio Addon Testing Framework

### 1. Stremio Addon Testing Tools

#### Official Stremio Testing
```bash
# Install Stremio Addon SDK for testing
npm install -g stremio-addon-sdk

# Test addon locally
stremio-addon-sdk test http://localhost:3000/manifest.json

# Validate addon manifest
stremio-addon-sdk validate manifest.json
```

#### Custom Testing Setup
```javascript
// tests/stremio/addon-integration.test.js
const { testAddon } = require('stremio-addon-sdk/test');

describe('Offlinio Addon Integration', () => {
  test('should respond to catalog requests', async () => {
    const addonUrl = 'http://localhost:3000';
    const response = await testAddon(addonUrl, {
      type: 'catalog',
      id: 'offlinio-movies',
      extra: { search: 'test movie' }
    });

    expect(response).toHaveProperty('metas');
    expect(Array.isArray(response.metas)).toBe(true);
  });

  test('should resolve stream URLs', async () => {
    const addonUrl = 'http://localhost:3000';
    const response = await testAddon(addonUrl, {
      type: 'stream',
      id: 'tt1234567',
      extra: { season: 1, episode: 1 }
    });

    expect(response).toHaveProperty('streams');
    expect(Array.isArray(response.streams)).toBe(true);
  });
});
```

### 2. Stremio Client Testing

#### Local Stremio Testing
```bash
# Install Stremio desktop client
# Add local addon: http://localhost:3000/manifest.json
# Test in development mode
```

#### Automated UI Testing
```javascript
// tests/e2e/stremio-client.test.js
const puppeteer = require('puppeteer');

describe('Stremio Client Integration', () => {
  test('should install addon successfully', async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Navigate to Stremio addon installation
    await page.goto('stremio://addon/community.offlinio');
    
    // Verify addon appears in library
    await page.waitForSelector('.addon-card');
    const addonCard = await page.$('.addon-card');
    expect(addonCard).toBeTruthy();
    
    await browser.close();
  });
});
```

### 3. Real-Debrid Integration Testing

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

#### Integration Tests
```javascript
// tests/integration/real-debrid.test.js
describe('Real-Debrid Integration', () => {
  beforeEach(() => {
    mockRealDebridAPI();
  });

  test('should process magnet link through Real-Debrid', async () => {
    const magnetLink = 'magnet:?xt=urn:btih:test-hash';
    const result = await processMagnetLink(magnetLink);
    
    expect(result).toHaveProperty('downloadUrl');
    expect(result.downloadUrl).toMatch(/^https?:\/\//);
  });
});
```

## Legal Compliance Strategy

### 1. Framework-Only Approach

#### Legal Disclaimer
```javascript
// src/legal/disclaimer.js
const LEGAL_DISCLAIMER = {
  title: "Offlinio - Download Framework Only",
  content: `
    Offlinio is a framework for downloading content that users have legal access to.
    
    LEGAL NOTICE:
    - This addon does not host, store, or provide any copyrighted content
    - Users are responsible for ensuring they have legal rights to download content
    - This tool is intended for personal use of legally obtained content only
    - Users must comply with all applicable copyright laws in their jurisdiction
    
    RECOMMENDED USAGE:
    - Public domain movies and TV shows
    - Content you own or have licensed
    - Free-to-air broadcasts
    - Creative Commons licensed content
  `
};
```

#### Content Validation
```javascript
// src/validation/content-validator.js
class ContentValidator {
  validateContentAccess(contentInfo) {
    // Check if content is in public domain
    if (this.isPublicDomain(contentInfo)) {
      return { allowed: true, reason: 'Public domain content' };
    }
    
    // Check if user has Real-Debrid subscription
    if (this.hasRealDebridAccess()) {
      return { allowed: true, reason: 'Real-Debrid subscription' };
    }
    
    // Check if content is free-to-air
    if (this.isFreeToAir(contentInfo)) {
      return { allowed: true, reason: 'Free-to-air content' };
    }
    
    return { allowed: false, reason: 'No legal access verified' };
  }

  isPublicDomain(contentInfo) {
    const currentYear = new Date().getFullYear();
    const releaseYear = contentInfo.year;
    
    // Content older than 95 years is typically public domain
    return (currentYear - releaseYear) > 95;
  }
}
```

### 2. Public Domain Content Library

#### Curated Public Domain Collection
```javascript
// src/content/public-domain.js
const PUBLIC_DOMAIN_CONTENT = [
  {
    id: 'pd-001',
    title: 'Nosferatu',
    year: 1922,
    type: 'movie',
    source: 'public-domain',
    description: 'Classic silent horror film - Public Domain'
  },
  {
    id: 'pd-002', 
    title: 'The Cabinet of Dr. Caligari',
    year: 1920,
    type: 'movie',
    source: 'public-domain',
    description: 'German Expressionist film - Public Domain'
  }
  // ... more public domain content
];

class PublicDomainService {
  getPublicDomainCatalog() {
    return {
      metas: PUBLIC_DOMAIN_CONTENT.map(item => ({
        id: item.id,
        name: item.title,
        type: item.type,
        year: item.year,
        poster: this.getPosterUrl(item.id),
        description: item.description,
        source: 'public-domain'
      }))
    };
  }
}
```

### 3. Real-Debrid User Handling

#### Real-Debrid Integration for Licensed Users
```javascript
// src/real-debrid/licensed-content.js
class LicensedContentHandler {
  async processRealDebridRequest(magnetLink, userApiKey) {
    // Verify Real-Debrid subscription
    const subscription = await this.verifyRealDebridSubscription(userApiKey);
    
    if (!subscription.active) {
      throw new Error('Real-Debrid subscription required for this content');
    }
    
    // Process through Real-Debrid
    const torrentId = await this.addToRealDebrid(magnetLink, userApiKey);
    const downloadUrl = await this.getDownloadUrl(torrentId, userApiKey);
    
    return {
      downloadUrl,
      source: 'real-debrid',
      requiresSubscription: true
    };
  }

  async verifyRealDebridSubscription(apiKey) {
    const response = await fetch('https://api.real-debrid.com/rest/1.0/user', {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    
    return response.json();
  }
}
```

## Testing Implementation

### 1. Unit Tests for Legal Compliance
```javascript
// tests/legal/compliance.test.js
describe('Legal Compliance', () => {
  test('should validate public domain content', () => {
    const validator = new ContentValidator();
    
    const publicDomainMovie = {
      title: 'Nosferatu',
      year: 1922,
      type: 'movie'
    };
    
    const result = validator.validateContentAccess(publicDomainMovie);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('Public domain content');
  });

  test('should require Real-Debrid for copyrighted content', () => {
    const validator = new ContentValidator();
    
    const copyrightedMovie = {
      title: 'Recent Movie',
      year: 2023,
      type: 'movie'
    };
    
    const result = validator.validateContentAccess(copyrightedMovie);
    expect(result.allowed).toBe(false);
  });
});
```

### 2. Integration Tests
```javascript
// tests/integration/addon-integration.test.js
describe('Addon Integration Tests', () => {
  test('should serve public domain catalog', async () => {
    const response = await request(app)
      .get('/catalog/movie/public-domain.json')
      .expect(200);

    expect(response.body.metas).toBeInstanceOf(Array);
    expect(response.body.metas.length).toBeGreaterThan(0);
    
    // Verify all content is public domain
    response.body.metas.forEach(meta => {
      expect(meta.source).toBe('public-domain');
    });
  });

  test('should handle Real-Debrid requests with valid API key', async () => {
    const response = await request(app)
      .post('/api/download')
      .send({
        magnetLink: 'magnet:?xt=urn:btih:test',
        realDebridApiKey: 'valid-api-key'
      })
      .expect(200);

    expect(response.body).toHaveProperty('downloadUrl');
    expect(response.body.source).toBe('real-debrid');
  });
});
```

### 3. E2E Tests
```javascript
// tests/e2e/user-workflows.test.js
describe('User Workflows', () => {
  test('should complete public domain download workflow', async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Navigate to addon
    await page.goto('http://localhost:3000');
    
    // Browse public domain content
    await page.click('#public-domain-tab');
    await page.waitForSelector('.content-item');
    
    // Select a movie
    await page.click('.content-item:first-child');
    
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

## Deployment and Distribution

### 1. Legal Documentation
- Clear terms of service
- Privacy policy
- Copyright compliance statement
- User responsibility guidelines

### 2. Content Filtering
- Default to public domain content only
- Require explicit Real-Debrid setup for other content
- Clear warnings about copyright compliance

### 3. User Education
- In-app tutorials about legal usage
- Links to public domain content sources
- Real-Debrid setup instructions
- Copyright law resources

This approach ensures the addon is legally compliant while providing value to users who want to download content they have legal access to, whether through public domain status or Real-Debrid subscriptions.
