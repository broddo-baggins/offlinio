/**
 * Storage Setup Wizard
 * 
 * Handles storage path management and validation:
 * - OS-specific default path suggestions
 * - Path validation and permission testing
 * - Free space checking and warnings
 * - Directory creation and setup
 * - Storage configuration persistence
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export interface StorageValidationResult {
  isValid: boolean;
  path?: string;
  errors: string[];
  warnings: string[];
  permissions: {
    readable: boolean;
    writable: boolean;
    executable: boolean;
  };
  freeSpace?: number;
  totalSpace?: number;
}

export interface StorageSetupResult {
  success: boolean;
  path?: string;
  error?: string;
  created?: boolean;
}

export interface DefaultPathSuggestion {
  path: string;
  description: string;
  platform: string;
  preferred: boolean;
}

export class StorageSetup {
  private prisma: PrismaClient;
  private static readonly MIN_FREE_SPACE_GB = 5; // Minimum 5GB free space
  private static readonly RECOMMENDED_FREE_SPACE_GB = 50; // Recommended 50GB free space

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get OS-specific default storage path suggestions
   */
  getDefaultPathSuggestions(): DefaultPathSuggestion[] {
    const platform = os.platform();
    const homeDir = os.homedir();
    const suggestions: DefaultPathSuggestion[] = [];

    switch (platform) {
      case 'win32':
        suggestions.push(
          {
            path: path.join(homeDir, 'Videos', 'Offlinio'),
            description: 'Default Windows Videos folder',
            platform: 'Windows',
            preferred: true
          },
          {
            path: path.join(homeDir, 'Documents', 'Offlinio'),
            description: 'Documents folder',
            platform: 'Windows',
            preferred: false
          },
          {
            path: 'D:\\Offlinio',
            description: 'Secondary drive (if available)',
            platform: 'Windows',
            preferred: false
          }
        );
        break;

      case 'darwin':
        suggestions.push(
          {
            path: path.join(homeDir, 'Movies', 'Offlinio'),
            description: 'Default macOS Movies folder',
            platform: 'macOS',
            preferred: true
          },
          {
            path: path.join(homeDir, 'Downloads', 'Offlinio'),
            description: 'Downloads folder',
            platform: 'macOS',
            preferred: false
          },
          {
            path: '/Volumes/External/Offlinio',
            description: 'External drive (if mounted)',
            platform: 'macOS',
            preferred: false
          }
        );
        break;

      case 'linux':
        suggestions.push(
          {
            path: path.join(homeDir, 'Videos', 'Offlinio'),
            description: 'Default Linux Videos folder',
            platform: 'Linux',
            preferred: true
          },
          {
            path: path.join(homeDir, 'Downloads', 'Offlinio'),
            description: 'Downloads folder',
            platform: 'Linux',
            preferred: false
          },
          {
            path: '/media/external/Offlinio',
            description: 'External media (if mounted)',
            platform: 'Linux',
            preferred: false
          }
        );
        break;

      default:
        suggestions.push({
          path: path.join(homeDir, 'Offlinio'),
          description: 'Home directory',
          platform: 'Unknown',
          preferred: true
        });
    }

    return suggestions;
  }

  /**
   * Get the current configured storage path
   */
  async getCurrentStoragePath(): Promise<string | null> {
    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'storage_path' }
      });

      return setting?.value || null;
    } catch (error) {
      logger.error('Failed to get current storage path:', error);
      return null;
    }
  }

  /**
   * Validate a storage path for suitability
   */
  async validatePath(targetPath: string): Promise<StorageValidationResult> {
    const result: StorageValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      permissions: {
        readable: false,
        writable: false,
        executable: false
      }
    };

    try {
      // Resolve and normalize path
      const resolvedPath = path.resolve(targetPath);
      result.path = resolvedPath;

      // Check if path exists
      const exists = await fs.pathExists(resolvedPath);

      if (!exists) {
        // Check if parent directory exists and is writable
        const parentDir = path.dirname(resolvedPath);
        const parentExists = await fs.pathExists(parentDir);

        if (!parentExists) {
          result.errors.push(`Parent directory does not exist: ${parentDir}`);
          return result;
        }

        try {
          await fs.access(parentDir, fs.constants.W_OK);
          result.warnings.push('Directory will be created');
        } catch {
          result.errors.push('Cannot create directory - parent is not writable');
          return result;
        }
      } else {
        // Path exists, check permissions
        try {
          await fs.access(resolvedPath, fs.constants.R_OK);
          result.permissions.readable = true;
        } catch {
          result.errors.push('Path is not readable');
        }

        try {
          await fs.access(resolvedPath, fs.constants.W_OK);
          result.permissions.writable = true;
        } catch {
          result.errors.push('Path is not writable');
        }

        try {
          await fs.access(resolvedPath, fs.constants.X_OK);
          result.permissions.executable = true;
        } catch {
          result.warnings.push('Path is not executable (might affect file serving)');
        }

        // Check if it's a file instead of directory
        const stats = await fs.stat(resolvedPath);
        if (!stats.isDirectory()) {
          result.errors.push('Path is a file, not a directory');
          return result;
        }
      }

      // Check free space using statvfs for better cross-platform support
      try {
        const targetForSpaceCheck = exists ? resolvedPath : path.dirname(resolvedPath);
        // Simple fallback: try to get free space info
        // Note: This is a simplified approach, in a real app you might use a dedicated library
        result.warnings.push('Free space checking not fully implemented - manual verification recommended');
      } catch (error) {
        result.warnings.push('Could not determine free space');
      }

      // Additional validations
      this.validatePathSecurity(resolvedPath, result);
      this.validatePathLength(resolvedPath, result);

      // Set overall validity
      result.isValid = result.errors.length === 0;

      return result;

    } catch (error: any) {
      result.errors.push(`Path validation failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Set up storage directory and save configuration
   */
  async setupStorage(targetPath: string, createIfNotExists: boolean = true): Promise<StorageSetupResult> {
    try {
      logger.info('Setting up storage directory', { path: targetPath });

      // Validate path first
      const validation = await this.validatePath(targetPath);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid path: ${validation.errors.join(', ')}`
        };
      }

      const resolvedPath = validation.path!;
      let created = false;

      // Create directory if it doesn't exist
      if (createIfNotExists && !(await fs.pathExists(resolvedPath))) {
        try {
          await fs.ensureDir(resolvedPath);
          created = true;
          logger.info('Created storage directory', { path: resolvedPath });
        } catch (error: any) {
          return {
            success: false,
            error: `Failed to create directory: ${error.message}`
          };
        }
      }

      // Create subdirectories for organization
      const subdirs = ['Movies', 'Series', 'temp', '.metadata'];
      for (const subdir of subdirs) {
        const subdirPath = path.join(resolvedPath, subdir);
        await fs.ensureDir(subdirPath);
      }

      // Test write permissions by creating a test file
      try {
        const testFile = path.join(resolvedPath, '.offlinio-test');
        await fs.writeFile(testFile, 'test');
        await fs.remove(testFile);
      } catch (error: any) {
        return {
          success: false,
          error: `Write test failed: ${error.message}`
        };
      }

      // Save configuration to database
      await this.prisma.setting.upsert({
        where: { key: 'storage_path' },
        update: { value: resolvedPath },
        create: { key: 'storage_path', value: resolvedPath }
      });

      // Save additional metadata
      await this.prisma.setting.upsert({
        where: { key: 'storage_setup_date' },
        update: { value: new Date().toISOString() },
        create: { key: 'storage_setup_date', value: new Date().toISOString() }
      });

      logger.info('Storage setup completed successfully', {
        path: resolvedPath,
        created,
        warnings: validation.warnings
      });

      return {
        success: true,
        path: resolvedPath,
        created
      };

    } catch (error: any) {
      logger.error('Storage setup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(storagePath?: string): Promise<{
    path: string;
    exists: boolean;
    freeSpace?: number;
    totalSpace?: number;
    usedSpace?: number;
    downloadCount?: number;
    totalSize?: number;
  } | null> {
    try {
      const currentPath = storagePath || await this.getCurrentStoragePath();
      
      if (!currentPath) {
        return null;
      }

      const exists = await fs.pathExists(currentPath);
      const stats: any = {
        path: currentPath,
        exists
      };

      if (exists) {
        // Get filesystem stats (simplified for now)
        try {
          // Note: Filesystem stats would need a proper cross-platform implementation
          // For now, we'll skip detailed space calculations
          logger.debug('Filesystem stats calculation skipped in this version');
        } catch (error) {
          logger.debug('Could not get filesystem stats:', error);
        }

        // Get download statistics from database
        try {
          const completedContent = await this.prisma.content.findMany({
            where: { status: 'completed' }
          });

          stats.downloadCount = completedContent.length;
          stats.totalSize = completedContent.reduce((sum, content) => sum + Number(content.fileSize || 0), 0);
        } catch (error) {
          logger.debug('Could not get download stats:', error);
        }
      }

      return stats;

    } catch (error) {
      logger.error('Failed to get storage stats:', error);
      return null;
    }
  }

  /**
   * Check if storage is properly configured
   */
  async isStorageConfigured(): Promise<boolean> {
    const currentPath = await this.getCurrentStoragePath();
    
    if (!currentPath) {
      return false;
    }

    const validation = await this.validatePath(currentPath);
    return validation.isValid;
  }

  /**
   * Get best default path for current system
   */
  getBestDefaultPath(): string {
    const suggestions = this.getDefaultPathSuggestions();
    const preferred = suggestions.find(s => s.preferred);
    return preferred?.path || suggestions[0]?.path || path.join(os.homedir(), 'Offlinio');
  }

  /**
   * Validate path security (private method)
   */
  private validatePathSecurity(targetPath: string, result: StorageValidationResult): void {
    // Check for system directories
    const systemPaths = [
      '/bin', '/sbin', '/usr/bin', '/usr/sbin', '/system', '/windows', '/winnt',
      'C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)'
    ];

    const normalizedPath = path.normalize(targetPath).toLowerCase();
    
    for (const systemPath of systemPaths) {
      if (normalizedPath.startsWith(systemPath.toLowerCase())) {
        result.errors.push('Cannot use system directories for storage');
        return;
      }
    }

    // Check for temp directories
    const tempDirs = [os.tmpdir(), '/tmp', '/var/tmp'];
    for (const tempDir of tempDirs) {
      if (normalizedPath.startsWith(path.normalize(tempDir).toLowerCase())) {
        result.warnings.push('Using temporary directory - files may be automatically deleted');
        break;
      }
    }
  }

  /**
   * Validate path length (private method)
   */
  private validatePathLength(targetPath: string, result: StorageValidationResult): void {
    const platform = os.platform();
    const maxPathLength = platform === 'win32' ? 260 : 1024;

    if (targetPath.length > maxPathLength - 100) { // Leave room for filenames
      result.warnings.push(`Path is very long (${targetPath.length} chars), may cause issues with long filenames`);
    }

    if (targetPath.length > maxPathLength) {
      result.errors.push(`Path exceeds maximum length (${maxPathLength} chars)`);
    }
  }

  /**
   * Clear storage configuration
   */
  async clearStorageConfig(): Promise<boolean> {
    try {
      await this.prisma.setting.deleteMany({
        where: {
          key: {
            in: ['storage_path', 'storage_setup_date']
          }
        }
      });

      logger.info('Storage configuration cleared');
      return true;

    } catch (error) {
      logger.error('Failed to clear storage config:', error);
      return false;
    }
  }
}
