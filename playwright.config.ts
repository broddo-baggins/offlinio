/**
 * Playwright End-to-End Test Configuration
 * 
 * Comprehensive E2E testing setup for:
 * - Stremio addon protocol validation
 * - Cross-browser compatibility
 * - API endpoint testing
 * - Download workflow validation
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  
  // Parallel execution for faster CI
  fullyParallel: true,
  
  // CI/CD specific settings
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Comprehensive reporting
  reporter: [
    ['html', { outputFolder: 'tests/results/playwright-report' }],
    ['json', { outputFile: 'tests/results/e2e-results.json' }],
    ['junit', { outputFile: 'tests/results/e2e-junit.xml' }],
    ['line']
  ],
  
  // Global test configuration
  use: {
    baseURL: 'http://127.0.0.1:11471',
    
    // Debugging and troubleshooting
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // Headers for Stremio compatibility
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'User-Agent': 'Offlinio-E2E-Tests/1.0'
    }
  },
  
  // Test projects for different scenarios
  projects: [
    {
      name: 'api-validation',
      testMatch: '**/api-*.e2e.test.ts',
      use: {
        // API-only tests don't need browser
        browserName: 'chromium',
        headless: true
      }
    },
    
    {
      name: 'stremio-addon-protocol',
      testMatch: '**/stremio-*.e2e.test.ts',
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          'User-Agent': 'Stremio/4.4.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json, text/plain, */*'
        }
      }
    },
    
    {
      name: 'cross-browser-compatibility',
      testMatch: '**/compatibility-*.e2e.test.ts',
      use: {
        ...devices['Desktop Firefox']
      }
    },
    
    {
      name: 'download-workflow',
      testMatch: '**/download-*.e2e.test.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Extended timeout for download operations
        actionTimeout: 30000
      }
    },
    
    // Mobile compatibility testing
    {
      name: 'mobile-compatibility',
      testMatch: '**/mobile-*.e2e.test.ts',
      use: {
        ...devices['iPhone 13']
      }
    }
  ],
  
  // Development server management
  webServer: {
    command: 'npm run start',
    url: 'http://127.0.0.1:11471/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    env: {
      NODE_ENV: 'test',
      PORT: '11471',
      LOG_LEVEL: 'error'
    }
  },
  
  // Global setup and teardown
  globalSetup: require.resolve('./tests/setup/global-setup.ts'),
  globalTeardown: require.resolve('./tests/setup/global-teardown.ts'),
  
  // Test configuration
  expect: {
    // Custom timeout for assertions
    timeout: 10000
  },
  
  // Output directories
  outputDir: 'tests/results/playwright-artifacts'
});
