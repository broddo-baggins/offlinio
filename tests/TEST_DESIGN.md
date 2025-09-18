# 🧪 Offlinio Testing Design & Strategy

Comprehensive testing framework for Stremio addon development and Real-Debrid integration.

---

## 🎯 **Testing Objectives**

1. **Stremio SDK Compliance** - Ensure full compatibility with Stremio addon protocol
2. **Real-Debrid Integration** - Validate download pipeline functionality  
3. **Local Storage & Serving** - Test file management and playback
4. **Cross-Platform Compatibility** - Verify operation on macOS, Windows, Linux
5. **Performance & Reliability** - Monitor resource usage and error handling

---

## 📊 **Test Categories**

### **1. Unit Tests** (`tests/unit/`)
Test individual components in isolation.

**Components to Test:**
- `src/services/real-debrid-client.ts` - API interactions
- `src/services/catalog.ts` - Content management
- `src/services/token-manager.ts` - Security functions
- `src/services/storage-setup.ts` - Path validation
- `src/utils/logger.ts` - Logging utilities

**Test Framework:** Jest + TypeScript

### **2. Integration Tests** (`tests/integration/`)
Test component interactions and data flow.

**Integration Points:**
- Database ↔ Catalog Service
- Real-Debrid Client ↔ Download Manager
- File Storage ↔ Stremio Stream Endpoints
- Token Manager ↔ Real-Debrid Authentication

### **3. End-to-End Tests** (`tests/e2e/`)
Test complete user workflows.

**User Scenarios:**
- Install addon in Stremio
- Download content via Real-Debrid
- Play downloaded content locally
- Manage storage and settings

---

## 🧭 **Test Execution Framework**

### **Test Runner Configuration**
```json
{
  "testEnvironment": "node",
  "testMatch": [
    "**/tests/**/*.test.ts",
    "**/tests/**/*.spec.ts"
  ],
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/server.ts"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

### **Test Data Management**
- **Mock Data**: Sample IMDB IDs, Real-Debrid responses
- **Test Database**: Isolated SQLite instance for testing
- **Test Storage**: Temporary directories for file operations
- **API Mocking**: Mock Real-Debrid and TMDB responses

---

## 🔍 **Stremio SDK Compliance Tests**

### **Manifest Validation**
**File:** `tests/integration/stremio-manifest.test.ts`

```typescript
describe('Stremio Manifest Compliance', () => {
  test('manifest contains required fields', async () => {
    const response = await request(app).get('/manifest.json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('name');
    expect(response.body).toHaveProperty('resources');
    expect(response.body.resources).toContain('catalog');
    expect(response.body.resources).toContain('meta');
    expect(response.body.resources).toContain('stream');
  });
});
```

### **Catalog Response Format**
**File:** `tests/integration/stremio-catalog.test.ts`

```typescript
describe('Catalog Endpoint Compliance', () => {
  test('returns valid catalog format', async () => {
    const response = await request(app)
      .get('/catalog/movie/offlinio-movies.json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('metas');
    expect(Array.isArray(response.body.metas)).toBe(true);
  });
});
```

### **Stream Response Format**
**File:** `tests/integration/stremio-stream.test.ts`

```typescript
describe('Stream Endpoint Compliance', () => {
  test('returns valid stream format', async () => {
    const response = await request(app)
      .get('/stream/movie/tt0111161.json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('streams');
    expect(Array.isArray(response.body.streams)).toBe(true);
    
    // Should always include download trigger
    const downloadStream = response.body.streams.find(
      s => s.name.includes('Download for Offline')
    );
    expect(downloadStream).toBeDefined();
  });
});
```

---

## 🔐 **Real-Debrid Integration Tests**

### **Authentication Tests**
**File:** `tests/unit/real-debrid-client.test.ts`

```typescript
describe('Real-Debrid Authentication', () => {
  test('validates API key correctly', async () => {
    const client = new RealDebridClient('valid_api_key');
    const result = await client.authenticate();
    expect(result.valid).toBe(true);
    expect(result.user).toBeDefined();
  });

  test('handles invalid API key', async () => {
    const client = new RealDebridClient('invalid_key');
    const result = await client.authenticate();
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### **Download Pipeline Tests**
**File:** `tests/integration/download-pipeline.test.ts`

```typescript
describe('Download Pipeline', () => {
  test('processes magnet to download URL', async () => {
    const magnetUri = 'magnet:?xt=urn:btih:test';
    const result = await realDebridClient.processMagnetToDirectUrl(magnetUri);
    
    expect(result.success).toBe(true);
    expect(result.downloadUrl).toMatch(/^https?:\/\//);
    expect(result.filename).toBeDefined();
  });
});
```

---

## 📁 **File Storage Tests**

### **Storage Setup Tests**
**File:** `tests/unit/storage-setup.test.ts`

```typescript
describe('Storage Setup', () => {
  test('validates storage path correctly', async () => {
    const storageSetup = new StorageSetup(prisma);
    const result = await storageSetup.validatePath('/tmp/test');
    
    expect(result.isValid).toBe(true);
    expect(result.permissions.writable).toBe(true);
  });

  test('creates directory structure', async () => {
    const storageSetup = new StorageSetup(prisma);
    const result = await storageSetup.setupStorage('/tmp/offlinio-test');
    
    expect(result.success).toBe(true);
    expect(fs.existsSync('/tmp/offlinio-test/Movies')).toBe(true);
    expect(fs.existsSync('/tmp/offlinio-test/Series')).toBe(true);
  });
});
```

---

## 🔒 **Security Tests**

### **Token Management Tests**
**File:** `tests/unit/token-manager.test.ts`

```typescript
describe('Token Security', () => {
  test('encrypts tokens correctly', async () => {
    const tokenManager = new TokenManager(prisma, 'test-key-32-characters-long!');
    const result = await tokenManager.storeToken('test-token');
    
    expect(result.success).toBe(true);
    
    const retrieved = await tokenManager.getToken();
    expect(retrieved).toBe('test-token');
  });

  test('validates token expiration', async () => {
    const tokenManager = new TokenManager(prisma);
    const isExpired = await tokenManager.isTokenExpired();
    
    expect(typeof isExpired).toBe('boolean');
  });
});
```

---

## 🎬 **End-to-End Test Scenarios**

### **Full Download Workflow**
**File:** `tests/e2e/download-workflow.test.ts`

```typescript
describe('Complete Download Workflow', () => {
  test('downloads content end-to-end', async () => {
    // 1. Start with content ID
    const contentId = 'tt0111161'; // The Shawshank Redemption
    
    // 2. Trigger download via stream endpoint
    const streamResponse = await request(app)
      .get(`/stream/movie/${contentId}.json`);
    
    const downloadUrl = streamResponse.body.streams
      .find(s => s.name.includes('Download'))?.url;
    
    // 3. Execute download
    const downloadResponse = await request(app)
      .get(downloadUrl.replace('http://127.0.0.1:11471', ''));
    
    expect(downloadResponse.status).toBe(200);
    
    // 4. Verify file appears in catalog
    await waitFor(async () => {
      const catalogResponse = await request(app)
        .get('/catalog/movie/offlinio-movies.json');
      
      const hasContent = catalogResponse.body.metas
        .some(meta => meta.id === contentId);
      
      expect(hasContent).toBe(true);
    });
    
    // 5. Verify file can be streamed
    const finalStreamResponse = await request(app)
      .get(`/stream/movie/${contentId}.json`);
    
    const localStream = finalStreamResponse.body.streams
      .find(s => s.url.includes('/files/'));
    
    expect(localStream).toBeDefined();
  });
});
```

---

## 📊 **Performance Tests**

### **Load Testing**
**File:** `tests/performance/load.test.ts`

```typescript
describe('Performance Tests', () => {
  test('handles concurrent catalog requests', async () => {
    const promises = Array.from({ length: 10 }, () =>
      request(app).get('/catalog/movie/offlinio-movies.json')
    );
    
    const responses = await Promise.all(promises);
    
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });

  test('memory usage stays within limits', async () => {
    const initialMemory = process.memoryUsage();
    
    // Perform operations
    for (let i = 0; i < 100; i++) {
      await request(app).get('/manifest.json');
    }
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    // Should not increase by more than 50MB
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });
});
```

---

## 🔄 **Continuous Testing**

### **Test Automation Pipeline**
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run build
      - run: npm run test:unit
      - run: npm run test:integration
      
      - name: Upload test results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: tests/results/
```

### **Pre-commit Testing**
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm run test:unit",
      "pre-push": "npm run test:integration"
    }
  }
}
```

---

## 📈 **Test Results Tracking**

### **Result Storage**
- **Location**: `tests/results/`
- **Format**: JSON with timestamps and detailed results
- **Retention**: Keep last 30 test runs
- **Metrics**: Coverage, performance, error rates

### **Test Report Generation**
```bash
# Generate comprehensive test report
npm run test:report

# Performance benchmarks
npm run test:performance

# Coverage analysis
npm run test:coverage
```

---

## 🎯 **Success Criteria**

### **Unit Tests**
- ✅ 80%+ code coverage
- ✅ All components test in isolation
- ✅ Mock external dependencies

### **Integration Tests**
- ✅ All API endpoints return valid responses
- ✅ Database operations work correctly
- ✅ Real-Debrid integration functions

### **E2E Tests**
- ✅ Complete download workflow
- ✅ Stremio addon installation
- ✅ Content playback verification

### **Performance Tests**
- ✅ Response times < 500ms for catalog requests
- ✅ Memory usage < 100MB base + 50MB per active download
- ✅ Handles 50+ concurrent requests

---

This testing framework ensures Offlinio maintains high quality, reliability, and full Stremio compatibility throughout development.
