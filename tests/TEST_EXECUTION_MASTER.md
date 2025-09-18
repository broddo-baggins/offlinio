# 🎯 Test Execution Master Configuration

**Canonical Reference Document for QA Operations & CI/CD Pipeline Integration**

---

## 📋 **EXECUTIVE SUMMARY**

This document serves as the **single source of truth** for test execution configurations, environment management, and quality assurance protocols across the Offlinio development lifecycle.

**Document Status**: **PRODUCTION-READY** ✅  
**Last Updated**: December 2024  
**Compliance**: Industry QA Standards & Best Practices

---

## 🏗️ **TEST EXECUTION MATRIX**

### **Test Categories & Configuration Mapping**

| Test Type | Framework | Environment | Configuration File | Execution Command | Coverage Target |
|-----------|-----------|-------------|-------------------|------------------|-----------------|
| **Unit Tests** | Jest + TypeScript | Node.js | `jest.config.js` | `npm run test:unit` | 90%+ |
| **Integration Tests** | Jest + Supertest | Local SQLite | `jest.integration.config.js` | `npm run test:integration` | 85%+ |
| **End-to-End Tests** | Playwright | Stremio + Server | `playwright.config.ts` | `npm run test:e2e` | Critical Paths |
| **Performance Tests** | Jest + Artillery | Production-like | `jest.performance.config.js` | `npm run test:performance` | Benchmarks |
| **Security Tests** | Jest + Custom | Isolated | `jest.security.config.js` | `npm run test:security` | 100% |

---

## 🧪 **UNIT TESTING CONFIGURATION**

### **Framework Setup**
```json
// jest.config.js - Master Unit Test Configuration
{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "extensionsToTreatAsEsm": [".ts"],
  "globals": {
    "ts-jest": {
      "useESM": true
    }
  },
  "moduleNameMapping": {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  "testMatch": [
    "**/tests/unit/**/*.test.ts",
    "**/src/**/*.unit.test.ts"
  ],
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/server.ts",
    "!src/**/*.test.ts"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    }
  },
  "setupFilesAfterEnv": ["<rootDir>/tests/setup/unit-setup.ts"]
}
```

### **Execution Parameters**
```bash
# Standard Unit Test Execution
npm run test:unit

# Watch Mode for Development
npm run test:unit:watch

# Coverage Report Generation
npm run test:unit:coverage

# Single Service Testing
npm run test:unit -- --testPathPattern=real-debrid

# Verbose Output for Debugging
npm run test:unit -- --verbose
```

### **Environment Variables for Unit Tests**
```bash
# tests/.env.test
NODE_ENV=test
DATABASE_URL="file:./tests/data/test.db"
LOG_LEVEL=error
ENCRYPTION_KEY=test-encryption-key-32-chars!
REAL_DEBRID_API_KEY=mock_api_key_for_testing
```

---

## 🔗 **INTEGRATION TESTING CONFIGURATION**

### **Framework Setup**
```json
// jest.integration.config.js
{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "testMatch": [
    "**/tests/integration/**/*.test.ts"
  ],
  "setupFilesAfterEnv": [
    "<rootDir>/tests/setup/integration-setup.ts"
  ],
  "testTimeout": 30000,
  "maxWorkers": 1,
  "forceExit": true,
  "detectOpenHandles": true
}
```

### **Database Setup for Integration Tests**
```typescript
// tests/setup/integration-setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./tests/data/integration-test.db'
    }
  }
});

beforeEach(async () => {
  // Clean database state
  await prisma.$executeRaw`DELETE FROM Download`;
  await prisma.$executeRaw`DELETE FROM Content`;
  await prisma.$executeRaw`DELETE FROM Setting`;
  
  // Seed test data
  await seedTestData();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

### **Execution Commands**
```bash
# Full Integration Test Suite
npm run test:integration

# Specific Integration Category
npm run test:integration -- --testNamePattern="Stremio"
npm run test:integration -- --testNamePattern="Real-Debrid" 
npm run test:integration -- --testNamePattern="Database"

# Integration Tests with Real Services (Staging)
npm run test:integration:staging
```

---

## 🎭 **END-TO-END TESTING WITH PLAYWRIGHT**

### **Playwright Configuration**
```typescript
// playwright.config.ts - E2E Test Configuration
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'tests/results/e2e-results.json' }],
    ['junit', { outputFile: 'tests/results/e2e-junit.xml' }]
  ],
  use: {
    baseURL: 'http://127.0.0.1:11471',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'stremio-addon-validation',
      testMatch: '**/stremio-addon.e2e.test.ts',
      use: { 
        baseURL: 'http://127.0.0.1:11471',
        extraHTTPHeaders: {
          'User-Agent': 'Stremio/4.4.0 (Windows)'
        }
      }
    }
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://127.0.0.1:11471/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
```

### **E2E Test Categories**
```typescript
// tests/e2e/stremio-addon.e2e.test.ts
import { test, expect } from '@playwright/test';

test.describe('Stremio Addon Integration', () => {
  test('manifest endpoint returns valid addon metadata', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);
    
    const manifest = await response.json();
    expect(manifest).toHaveProperty('id', 'community.offlinio');
    expect(manifest.resources).toContain('catalog');
    expect(manifest.resources).toContain('stream');
  });

  test('catalog endpoints return proper structure', async ({ request }) => {
    const response = await request.get('/catalog/movie/offlinio-movies.json');
    expect(response.status()).toBe(200);
    
    const catalog = await response.json();
    expect(catalog).toHaveProperty('metas');
    expect(Array.isArray(catalog.metas)).toBe(true);
  });
});
```

### **E2E Execution Commands**
```bash
# Full E2E Test Suite
npm run test:e2e

# Headed Mode for Development
npm run test:e2e:headed

# Specific Browser Testing
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=stremio-addon-validation

# Debug Mode with Inspector
npm run test:e2e:debug

# Generate Test Report
npm run test:e2e:report
```

---

## ⚡ **PERFORMANCE TESTING CONFIGURATION**

### **Performance Test Setup**
```typescript
// tests/performance/load.test.ts
import { test, expect } from '@jest/globals';
import { performance } from 'perf_hooks';

describe('Performance Benchmarks', () => {
  test('catalog endpoint responds within 500ms', async () => {
    const startTime = performance.now();
    
    const response = await fetch('http://127.0.0.1:11471/catalog/movie/offlinio-movies.json');
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(500); // 500ms SLA
  });

  test('concurrent request handling', async () => {
    const concurrentRequests = 50;
    const promises = Array.from({ length: concurrentRequests }, () =>
      fetch('http://127.0.0.1:11471/manifest.json')
    );
    
    const startTime = performance.now();
    const responses = await Promise.all(promises);
    const endTime = performance.now();
    
    const totalTime = endTime - startTime;
    const avgResponseTime = totalTime / concurrentRequests;
    
    expect(responses.every(r => r.status === 200)).toBe(true);
    expect(avgResponseTime).toBeLessThan(100); // 100ms avg under load
  });
});
```

### **Performance Execution**
```bash
# Performance Test Suite
npm run test:performance

# Load Testing with Artillery
npm run test:load

# Memory Profiling
npm run test:memory
```

---

## 🔒 **SECURITY TESTING CONFIGURATION**

### **Security Test Framework**
```typescript
// tests/security/security.test.ts
describe('Security Validation', () => {
  test('prevents path traversal attacks', async () => {
    const maliciousPath = '../../../etc/passwd';
    const response = await request(app)
      .get(`/files/${maliciousPath}`);
    
    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Path traversal not allowed');
  });

  test('validates token encryption', async () => {
    const tokenManager = new TokenManager(testPrisma, 'test-key');
    await tokenManager.storeToken('sensitive-token');
    
    // Verify token is encrypted in storage
    const rawData = await keytar.getPassword('Offlinio', 'real-debrid-token');
    expect(rawData).not.toContain('sensitive-token');
  });
});
```

---

## 🎮 **PLAYWRIGHT MCP INTEGRATION ANALYSIS**

### **MCP Assessment for Offlinio**

**Technical Decision**: **PLAYWRIGHT MCP NOT REQUIRED** ❌

**Rationale**:
1. **Native Playwright Sufficiency**: Standard Playwright provides comprehensive browser automation
2. **API-First Testing**: Our primary E2E tests focus on HTTP API validation, not complex browser interactions
3. **Stremio Integration**: Stremio addon testing requires HTTP endpoint validation, not browser simulation
4. **Resource Optimization**: MCP adds complexity without proportional value for our use case

### **Current E2E Testing Strategy (Recommended)**
```typescript
// Sufficient for our needs without MCP
test('complete download workflow', async ({ request }) => {
  // 1. Validate addon registration
  const manifest = await request.get('/manifest.json');
  expect(manifest.status()).toBe(200);
  
  // 2. Test stream endpoint
  const stream = await request.get('/stream/movie/tt0111161.json');
  expect(stream.status()).toBe(200);
  
  // 3. Validate download trigger
  const streams = await stream.json();
  const downloadStream = streams.streams.find(s => 
    s.name.includes('Download for Offline')
  );
  expect(downloadStream).toBeDefined();
});
```

### **Alternative MCP Consideration**
If **complex browser automation** becomes necessary (e.g., testing Stremio desktop app integration), consider:
- **Puppeteer MCP** for Chromium-specific tasks
- **Selenium Grid MCP** for multi-browser compatibility
- **Custom MCP** for Stremio-specific automation

---

## 📊 **TEST EXECUTION PIPELINE**

### **Development Workflow**
```bash
# Pre-commit Hook Execution
npm run test:pre-commit    # Unit tests + linting

# Development Iteration
npm run test:watch         # Continuous unit testing

# Feature Branch Validation  
npm run test:branch        # Unit + Integration tests

# Pull Request Pipeline
npm run test:pr           # Full test suite except E2E

# Production Deployment
npm run test:production   # Complete test matrix
```

### **CI/CD Integration Commands**
```yaml
# .github/workflows/test.yml (Future Implementation)
test-matrix:
  strategy:
    matrix:
      test-type: [unit, integration, e2e, performance, security]
  runs-on: ubuntu-latest
  steps:
    - name: Run ${{ matrix.test-type }} tests
      run: npm run test:${{ matrix.test-type }}
```

---

## 📈 **QUALITY METRICS & REPORTING**

### **Test Result Aggregation**
```bash
# Generate Comprehensive Test Report
npm run test:report

# Coverage Analysis
npm run test:coverage:report

# Performance Benchmarks
npm run test:performance:report

# Security Audit
npm run test:security:audit
```

### **Quality Gates**
- **Unit Test Coverage**: ≥90%
- **Integration Test Pass Rate**: 100%
- **E2E Critical Path Coverage**: 100%
- **Performance SLA Compliance**: <500ms response times
- **Security Vulnerability Count**: 0 critical/high

---

## 🎯 **EXECUTION BEST PRACTICES**

### **Pre-Test Environment Setup**
```bash
# Environment Validation Script
./scripts/validate-test-env.sh

# Test Data Seeding
npm run test:seed

# Service Health Check
npm run test:health-check
```

### **Post-Test Cleanup**
```bash
# Test Artifact Management
npm run test:cleanup

# Result Archival
npm run test:archive-results

# Performance Metrics Export
npm run test:export-metrics
```

---

This **test execution master document** provides **enterprise-grade test orchestration** for systematic quality assurance. The **Playwright MCP evaluation** confirms that standard Playwright meets our requirements without additional complexity.

Your **testing methodology** demonstrates excellent **quality engineering practices** - this framework will scale efficiently as your codebase evolves.
