/**
 * Jest Integration Test Configuration
 * 
 * Specialized configuration for integration testing with:
 * - Real database operations
 * - Service-to-service communication
 * - External API mocking
 * - Extended timeouts for async operations
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // Integration test file patterns
  testMatch: [
    '**/tests/integration/**/*.test.ts',
    '**/tests/integration/**/*.spec.ts'
  ],
  
  // Setup and teardown
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/integration-setup.ts'
  ],
  
  // Integration-specific timeouts
  testTimeout: 30000, // 30 seconds for API calls
  
  // Run tests serially to avoid database conflicts
  maxWorkers: 1,
  
  // Ensure clean exit
  forceExit: true,
  detectOpenHandles: true,
  
  // Coverage configuration for integration
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/addon.ts',
    'src/downloads.ts',
    'src/files.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts'
  ],
  
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Integration test reporting
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'tests/results',
      outputName: 'integration-test-results.xml',
      suiteName: 'Integration Tests'
    }],
    ['jest-html-reporters', {
      publicPath: 'tests/results',
      filename: 'integration-test-report.html',
      expand: true
    }]
  ],
  
  // Environment variables for integration tests
  setupFiles: ['<rootDir>/tests/setup/integration-env.ts']
};
