/**
 * Integration Test Setup & Teardown
 *
 * Manages test environment for integration testing:
 * - Database initialization and cleanup
 * - Test data seeding
 * - Service mocking configuration
 * - Environment variable management
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs-extra';
import path from 'path';
import { beforeAll, beforeEach, afterEach, afterAll } from '@jest/globals';
// Test-specific database instance
const testDbPath = path.join(process.cwd(), 'tests', 'data', 'integration-test.db');
const testPrisma = new PrismaClient({
    datasources: {
        db: {
            url: `file:${testDbPath}`
        }
    },
    log: ['error'] // Minimal logging for tests
});
// Test data fixtures
const testContent = {
    movie: {
        id: 'tt0111161',
        imdbId: 'tt0111161',
        type: 'movie',
        title: 'The Shawshank Redemption',
        year: 1994,
        genre: 'Drama',
        description: 'Test movie for integration testing',
        status: 'completed',
        filePath: 'Movies/The Shawshank Redemption (1994).mkv',
        fileSize: BigInt(1024 * 1024 * 1024) // 1GB
    },
    series: {
        id: 'tt0903747',
        imdbId: 'tt0903747',
        type: 'series',
        title: 'Breaking Bad',
        year: 2008,
        genre: 'Crime',
        description: 'Test series for integration testing',
        status: 'completed',
        seriesId: 'breaking-bad'
    }
};
const testSettings = [
    { key: 'storage_path', value: '/tmp/offlinio-test' },
    { key: 'legal_notice_version', value: '1.0.0' },
    { key: 'app_version', value: '0.1.0-test' }
];
/**
 * Global setup for integration tests
 */
beforeAll(async () => {
    // Ensure test data directory exists
    await fs.ensureDir(path.dirname(testDbPath));
    // Remove existing test database
    if (await fs.pathExists(testDbPath)) {
        await fs.remove(testDbPath);
    }
    // Run database migrations for test database
    process.env.DATABASE_URL = `file:${testDbPath}`;
    // Deploy migrations to test database
    const { execSync } = require('child_process');
    try {
        execSync('npx prisma migrate deploy', {
            env: { ...process.env, DATABASE_URL: `file:${testDbPath}` },
            stdio: 'pipe'
        });
    }
    catch (error) {
        console.error('Failed to run migrations for test database:', error);
        throw error;
    }
    console.log('Integration test environment initialized');
});
/**
 * Setup before each test
 */
beforeEach(async () => {
    // Clean all tables
    await testPrisma.download.deleteMany();
    await testPrisma.content.deleteMany();
    await testPrisma.setting.deleteMany();
    await testPrisma.metadataCache.deleteMany();
    await testPrisma.legalAcceptance.deleteMany();
    await testPrisma.realDebridToken.deleteMany();
    // Seed basic test data
    await seedTestData();
});
/**
 * Cleanup after each test
 */
afterEach(async () => {
    // Optional: Additional cleanup if needed
    jest.clearAllMocks();
});
/**
 * Global cleanup for integration tests
 */
afterAll(async () => {
    // Disconnect from test database
    await testPrisma.$disconnect();
    // Clean up test database file
    if (await fs.pathExists(testDbPath)) {
        await fs.remove(testDbPath);
    }
    console.log('Integration test environment cleaned up');
});
/**
 * Seed test data for consistent test state
 */
async function seedTestData() {
    // Create test settings
    for (const setting of testSettings) {
        await testPrisma.setting.create({
            data: setting
        });
    }
    // Create test content
    await testPrisma.content.create({
        data: testContent.movie
    });
    await testPrisma.content.create({
        data: testContent.series
    });
    // Create legal acceptance record
    await testPrisma.legalAcceptance.create({
        data: {
            version: '1.0.0',
            accepted: true,
            userAgent: 'Test Suite',
            ipAddress: '127.0.0.1'
        }
    });
}
/**
 * Helper function to get test database instance
 */
export function getTestDatabase() {
    return testPrisma;
}
/**
 * Helper function to create test content
 */
export async function createTestContent(contentData) {
    return await testPrisma.content.create({ data: contentData });
}
/**
 * Helper function to create test download
 */
export async function createTestDownload(contentId, downloadData) {
    return await testPrisma.download.create({
        data: {
            contentId,
            ...downloadData
        }
    });
}
/**
 * Helper function to mock Real-Debrid API responses
 */
export function mockRealDebridAPI() {
    // Mock implementation would go here
    // For now, we'll use environment variables to control behavior
    process.env.REAL_DEBRID_API_KEY = 'test_api_key';
    process.env.MOCK_REAL_DEBRID = 'true';
}
/**
 * Helper function to clean test storage directory
 */
export async function cleanTestStorage() {
    const testStoragePath = '/tmp/offlinio-test';
    if (await fs.pathExists(testStoragePath)) {
        await fs.remove(testStoragePath);
    }
    await fs.ensureDir(testStoragePath);
}
// Export test fixtures for use in tests
export { testContent, testSettings };
//# sourceMappingURL=integration-setup.js.map