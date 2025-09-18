/**
 * Jest Performance Test Configuration
 * 
 * Specialized configuration for performance and load testing:
 * - Response time benchmarks
 * - Memory usage profiling
 * - Concurrent request handling
 * - Resource utilization monitoring
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
  
  // Performance test patterns
  testMatch: [
    '**/tests/performance/**/*.test.ts',
    '**/tests/load/**/*.test.ts'
  ],
  
  // Setup for performance monitoring
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/performance-setup.ts'
  ],
  
  // Extended timeouts for load tests
  testTimeout: 120000, // 2 minutes for load testing
  
  // Single worker to avoid resource contention
  maxWorkers: 1,
  
  // Performance test reporting
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'tests/results',
      outputName: 'performance-test-results.xml',
      suiteName: 'Performance Tests'
    }],
    ['<rootDir>/tests/reporters/performance-reporter.js']
  ],
  
  // No coverage collection for performance tests
  collectCoverage: false,
  
  // Performance monitoring globals
  globals: {
    ...module.exports.globals,
    PERFORMANCE_THRESHOLDS: {
      CATALOG_RESPONSE_TIME: 500, // milliseconds
      MANIFEST_RESPONSE_TIME: 100,
      STREAM_RESPONSE_TIME: 200,
      DOWNLOAD_INITIATION_TIME: 1000,
      MEMORY_LIMIT: 100 * 1024 * 1024 // 100MB
    }
  }
};
