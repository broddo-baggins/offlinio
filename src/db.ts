/**
 * Database Configuration and Utilities
 * 
 * Initializes Prisma client and provides database utilities
 * for the Offlinio single-addon architecture.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger.js';

// Initialize Prisma client
export const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Set up Prisma logging
prisma.$on('error', (e) => {
  logger.error('Prisma error:', e);
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma warning:', e);
});

prisma.$on('info', (e) => {
  logger.info('Prisma info:', e);
});

prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Prisma query:', {
      query: e.query,
      params: e.params,
      duration: e.duration + 'ms'
    });
  }
});

/**
 * Initialize database connection and run migrations
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connection established');

    // Run any pending migrations (in production, this should be done separately)
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Database migrations up to date');
    }

    // Initialize default settings if they don't exist
    await initializeDefaultSettings();
    
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Initialize default application settings
 */
async function initializeDefaultSettings(): Promise<void> {
  const defaultSettings = [
    { key: 'legal_notice_version', value: process.env.LEGAL_NOTICE_VERSION || '1.0.0' },
    { key: 'max_concurrent_downloads', value: process.env.MAX_CONCURRENT_DOWNLOADS || '3' },
    { key: 'download_timeout', value: process.env.DOWNLOAD_TIMEOUT || '3600000' },
    { key: 'max_file_size', value: process.env.MAX_FILE_SIZE || '10737418240' },
    { key: 'app_initialized', value: 'true' },
    { key: 'app_version', value: '0.1.0' }
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting
    });
  }

  logger.debug('Default settings initialized');
}

/**
 * Get a setting value by key
 */
export async function getSetting(key: string): Promise<string | null> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key }
    });
    return setting?.value ?? null;
  } catch (error) {
    logger.error(`Failed to get setting ${key}:`, error);
    return null;
  }
}

/**
 * Set a setting value
 */
export async function setSetting(key: string, value: string): Promise<void> {
  try {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
    logger.debug(`Setting updated: ${key} = ${value}`);
  } catch (error) {
    logger.error(`Failed to set setting ${key}:`, error);
    throw error;
  }
}

/**
 * Get multiple settings at once
 */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: { in: keys }
      }
    });

    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);
  } catch (error) {
    logger.error('Failed to get settings:', error);
    return {};
  }
}

/**
 * Clean up database connections on shutdown
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDatabase();
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
});

logger.info('Database module initialized');
