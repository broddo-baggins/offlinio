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
declare const testContent: {
    movie: {
        id: string;
        imdbId: string;
        type: string;
        title: string;
        year: number;
        genre: string;
        description: string;
        status: string;
        filePath: string;
        fileSize: bigint;
    };
    series: {
        id: string;
        imdbId: string;
        type: string;
        title: string;
        year: number;
        genre: string;
        description: string;
        status: string;
        seriesId: string;
    };
};
declare const testSettings: {
    key: string;
    value: string;
}[];
/**
 * Helper function to get test database instance
 */
export declare function getTestDatabase(): PrismaClient;
/**
 * Helper function to create test content
 */
export declare function createTestContent(contentData: any): Promise<any>;
/**
 * Helper function to create test download
 */
export declare function createTestDownload(contentId: string, downloadData: any): Promise<any>;
/**
 * Helper function to mock Real-Debrid API responses
 */
export declare function mockRealDebridAPI(): void;
/**
 * Helper function to clean test storage directory
 */
export declare function cleanTestStorage(): Promise<void>;
export { testContent, testSettings };
//# sourceMappingURL=integration-setup.d.ts.map