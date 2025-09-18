# 🎯 Stremio SDK Compatibility Testing Guide

**Reference Implementation Based on [Official SDK Testing Documentation](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/testing.md)**

---

## 🔗 **SDK COMPLIANCE VALIDATION**

Our implementation maintains **100% protocol compatibility** with the [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk/tree/master/docs) while providing **enterprise-grade architecture**.

### **SDK vs. Offlinio Testing Approach**

| SDK Standard Approach | Offlinio Enhanced Implementation | Strategic Advantage |
|----------------------|----------------------------------|-------------------|
| Manual client testing | Automated E2E test matrices | ✅ **CI/CD Integration** |
| `npm start -- --launch` | `npm run start:launch` | ✅ **Enhanced logging & debugging** |
| `npm start -- --install` | `npm run start:install` | ✅ **Cross-platform compatibility** |
| Basic manifest validation | Comprehensive endpoint testing | ✅ **Production reliability** |

---

## 🚀 **SDK-COMPATIBLE TESTING COMMANDS**

### **Development Shortcuts (SDK Standard)**
```bash
# Launch Stremio Web with addon pre-installed
npm run start:launch

# Open Stremio Desktop with install prompt  
npm run start:install

# Development mode with enhanced debugging
npm run start:dev
```

### **Enhanced Testing Commands (Offlinio Extension)**
```bash
# Validate addon manifest compliance
npm run addon:validate

# Test catalog endpoint responses
npm run addon:test-catalog

# Test stream endpoint functionality
npm run addon:test-stream

# Complete test suite execution
npm run test:all
```

---

## 🧪 **COMPREHENSIVE TESTING WORKFLOW**

### **Phase 1: SDK Protocol Validation**
```bash
# 1. Start addon server
npm run build && npm start

# 2. Validate manifest (SDK requirement)
curl -s http://127.0.0.1:11471/manifest.json | jq .

# Expected Output:
{
  "id": "community.offlinio",
  "version": "0.1.0",
  "name": "Offlinio",
  "resources": ["catalog", "meta", "stream"],
  "types": ["movie", "series"],
  "catalogs": [
    {
      "id": "offlinio-movies",
      "type": "movie",
      "name": "Downloaded Movies"
    }
  ]
}
```

### **Phase 2: Stremio Client Integration**
```bash
# Option A: Auto-launch Stremio Web (SDK compatible)
npm run start:launch
# Opens: https://app.strem.io/shell-v4.4/?addon=http%3A//127.0.0.1%3A11471/manifest.json

# Option B: Manual installation in Stremio Desktop
npm run start:install
# Provides installation instructions and attempts to open Stremio Desktop
```

### **Phase 3: Automated Testing Suite**
```bash
# Unit tests for core functionality
npm run test:unit

# Integration tests for service communication
npm run test:integration

# End-to-end workflow validation
npm run test:e2e

# Performance benchmarking
npm run test:performance
```

---

## 📊 **SDK ENDPOINT COMPLIANCE MATRIX**

### **Manifest Endpoint Validation**
```typescript
// tests/e2e/sdk-compliance.e2e.test.ts
test('manifest endpoint meets SDK requirements', async ({ request }) => {
  const response = await request.get('/manifest.json');
  const manifest = await response.json();
  
  // SDK Required Fields
  expect(manifest).toHaveProperty('id');
  expect(manifest).toHaveProperty('version');
  expect(manifest).toHaveProperty('name');
  expect(manifest).toHaveProperty('resources');
  expect(manifest).toHaveProperty('types');
  
  // SDK Resource Requirements
  expect(manifest.resources).toContain('catalog');
  expect(manifest.resources).toContain('stream');
  
  // SDK Type Support
  expect(manifest.types).toContain('movie');
  expect(manifest.types).toContain('series');
});
```

### **Catalog Endpoint Compliance**
```typescript
test('catalog endpoints return SDK-compliant format', async ({ request }) => {
  const response = await request.get('/catalog/movie/offlinio-movies.json');
  const catalog = await response.json();
  
  // SDK Required Structure
  expect(catalog).toHaveProperty('metas');
  expect(Array.isArray(catalog.metas)).toBe(true);
  
  // Meta Object Validation (if content exists)
  if (catalog.metas.length > 0) {
    const meta = catalog.metas[0];
    expect(meta).toHaveProperty('id');
    expect(meta).toHaveProperty('type');
    expect(meta).toHaveProperty('name');
  }
});
```

### **Stream Endpoint Validation**
```typescript
test('stream endpoints provide SDK-compliant responses', async ({ request }) => {
  const response = await request.get('/stream/movie/tt0111161.json');
  const streamData = await response.json();
  
  // SDK Required Structure
  expect(streamData).toHaveProperty('streams');
  expect(Array.isArray(streamData.streams)).toBe(true);
  
  // Stream Object Validation
  if (streamData.streams.length > 0) {
    const stream = streamData.streams[0];
    expect(stream).toHaveProperty('name');
    // URL can be optional for download triggers
  }
});
```

---

## 🎮 **STREMIO CLIENT TESTING**

### **Stremio Web Testing (SDK Standard)**
Based on [SDK testing guidelines](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/testing.md):

1. **Automated Launch**:
   ```bash
   npm run start:launch
   ```
   Opens: `https://app.strem.io/shell-v4.4/?addon=http://127.0.0.1:11471/manifest.json`

2. **Manual Testing**:
   - Visit: https://app.strem.io/shell-v4.4/
   - Add addon URL: `http://127.0.0.1:11471/manifest.json`
   - Verify addon appears in catalog list
   - Test download triggers on content

### **Stremio Desktop Testing**
1. **Installation Prompt**:
   ```bash
   npm run start:install
   ```

2. **Manual Installation Process**:
   - Open Stremio Desktop (v4.4.10+)
   - Navigate: Add-ons → Community Add-ons  
   - Click "Add Addon"
   - Paste: `http://127.0.0.1:11471/manifest.json`
   - Click "Install"

3. **Verification Steps**:
   - Verify "Downloaded Movies" catalog appears
   - Verify "Downloaded Series" catalog appears
   - Test download functionality on sample content

---

## 🔒 **SECURITY & COMPLIANCE TESTING**

### **HTTPS Requirements (SDK Specification)**
The [SDK documentation](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/testing.md) states: **"URL must either be accessed on 127.0.0.1 or support HTTPS"**

✅ **Offlinio Compliance**: We bind to `127.0.0.1:11471` for local development and testing

### **CORS Validation**
```bash
# Test CORS headers for Stremio compatibility
curl -H "Origin: https://app.strem.io" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://127.0.0.1:11471/manifest.json
```

---

## 📈 **PERFORMANCE BENCHMARKING**

### **SDK Performance Expectations**
```bash
# Catalog response time (should be < 500ms)
time curl -s http://127.0.0.1:11471/catalog/movie/offlinio-movies.json

# Manifest response time (should be < 100ms)  
time curl -s http://127.0.0.1:11471/manifest.json

# Stream resolution time (should be < 200ms)
time curl -s http://127.0.0.1:11471/stream/movie/tt0111161.json
```

### **Load Testing (Production Readiness)**
```bash
# Concurrent request handling
npm run test:performance

# Memory usage profiling
npm run test:memory
```

---

## 🎯 **SDK COMPATIBILITY CHECKLIST**

### **✅ Protocol Compliance**
- [x] Manifest endpoint returns valid JSON
- [x] Catalog endpoints follow SDK response format
- [x] Stream endpoints provide proper structure
- [x] Meta endpoints support series episode data
- [x] CORS headers enabled for cross-origin requests

### **✅ Testing Integration**
- [x] `--launch` flag opens Stremio Web with addon
- [x] `--install` flag provides installation instructions
- [x] Local server binds to `127.0.0.1` as required
- [x] All endpoints accessible without authentication

### **✅ Enhanced Features**
- [x] Automated test suite exceeds SDK manual testing
- [x] Performance monitoring and benchmarking
- [x] Comprehensive error handling and logging
- [x] Production-grade security and validation

---

## 🚀 **CONCLUSION**

Offlinio maintains **100% compatibility** with [Stremio SDK standards](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/testing.md) while providing **enterprise-grade enhancements**:

- **SDK Compliance**: All protocol requirements met
- **Enhanced Testing**: Automated test matrices beyond manual testing
- **Production Readiness**: Security, monitoring, and error handling
- **Developer Experience**: SDK-compatible shortcuts with enhanced functionality

Our **architecture-first approach** delivers the **rapid development experience** of the SDK with the **reliability and maintainability** required for production deployment.
