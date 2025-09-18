/**
 * First-Run Setup Wizard
 * 
 * Guides users through initial configuration:
 * 1. Legal notice acceptance
 * 2. Storage directory selection
 * 3. Real-Debrid token configuration
 * 4. Initial validation and testing
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger.js';
import { TokenManager } from './services/token-manager.js';

export interface SetupConfig {
  storageDirectory: string;
  realDebridToken?: string;
  legalAccepted: boolean;
  setupCompleted: boolean;
}

export interface StorageValidation {
  valid: boolean;
  path: string;
  errors: string[];
  warnings: string[];
  availableSpace: number;
  permissions: {
    read: boolean;
    write: boolean;
    execute: boolean;
  };
}

export class SetupWizard {
  private prisma: PrismaClient;
  private tokenManager: TokenManager;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.tokenManager = new TokenManager(prisma);
  }

  /**
   * Check if setup is required
   */
  async isSetupRequired(): Promise<boolean> {
    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'setup_completed' }
      });

      return setting?.value !== 'true';
    } catch (error) {
      logger.error('Failed to check setup status:', error);
      return true; // Assume setup is required if we can't check
    }
  }

  /**
   * Get platform-specific default storage paths
   */
  getDefaultStoragePaths(): string[] {
    const homeDir = os.homedir();
    
    switch (process.platform) {
      case 'darwin': // macOS
        return [
          path.join(homeDir, 'Movies', 'Offlinio'),
          path.join(homeDir, 'Downloads', 'Offlinio'),
          path.join(homeDir, 'Documents', 'Offlinio')
        ];
      
      case 'win32': // Windows
        return [
          path.join(homeDir, 'Videos', 'Offlinio'),
          path.join(homeDir, 'Downloads', 'Offlinio'),
          path.join(homeDir, 'Documents', 'Offlinio')
        ];
      
      case 'linux': // Linux
        return [
          path.join(homeDir, 'Videos', 'Offlinio'),
          path.join(homeDir, 'Downloads', 'Offlinio'),
          path.join(homeDir, 'Documents', 'Offlinio')
        ];
      
      default:
        return [
          path.join(homeDir, 'Offlinio'),
          path.join(homeDir, 'Downloads', 'Offlinio')
        ];
    }
  }

  /**
   * Validate storage directory
   */
  async validateStorageDirectory(dirPath: string): Promise<StorageValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let availableSpace = 0;
    
    const permissions = {
      read: false,
      write: false,
      execute: false
    };

    try {
      // Check if path is absolute
      if (!path.isAbsolute(dirPath)) {
        errors.push('Path must be absolute');
        return { valid: false, path: dirPath, errors, warnings, availableSpace, permissions };
      }

      // Create directory if it doesn't exist
      if (!await fs.pathExists(dirPath)) {
        try {
          await fs.ensureDir(dirPath);
          logger.info(`Created storage directory: ${dirPath}`);
        } catch (error) {
          errors.push(`Cannot create directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return { valid: false, path: dirPath, errors, warnings, availableSpace, permissions };
        }
      }

      // Check permissions
      try {
        await fs.access(dirPath, fs.constants.R_OK);
        permissions.read = true;
      } catch {
        errors.push('Directory is not readable');
      }

      try {
        await fs.access(dirPath, fs.constants.W_OK);
        permissions.write = true;
      } catch {
        errors.push('Directory is not writable');
      }

      try {
        await fs.access(dirPath, fs.constants.X_OK);
        permissions.execute = true;
      } catch {
        errors.push('Directory is not executable');
      }

      // Check available space
      try {
        const stats = await fs.stat(dirPath);
        if (stats.isDirectory()) {
          // Get available space (this is platform-specific)
          const { spawn } = await import('child_process');
          
          const getSpace = () => new Promise<number>((resolve) => {
            let command: string;
            let args: string[];
            
            if (process.platform === 'win32') {
              command = 'powershell';
              args = ['-Command', `(Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='${path.parse(dirPath).root.replace('\\', '')}'" | Select-Object -ExpandProperty FreeSpace)`];
            } else {
              command = 'df';
              args = ['-B1', dirPath];
            }
            
            const child = spawn(command, args);
            let output = '';
            
            child.stdout?.on('data', (data) => {
              output += data.toString();
            });
            
            child.on('close', () => {
              try {
                if (process.platform === 'win32') {
                  const bytes = parseInt(output.trim());
                  resolve(isNaN(bytes) ? 0 : bytes);
                } else {
                  const lines = output.trim().split('\n');
                  const spaceLine = lines[lines.length - 1];
                  const available = parseInt(spaceLine.split(/\s+/)[3]);
                  resolve(isNaN(available) ? 0 : available);
                }
              } catch {
                resolve(0);
              }
            });
            
            child.on('error', () => resolve(0));
          });
          
          availableSpace = await getSpace();
          
          // Warn if less than 10GB available
          if (availableSpace > 0 && availableSpace < 10 * 1024 * 1024 * 1024) {
            warnings.push(`Low disk space: ${Math.round(availableSpace / (1024 * 1024 * 1024))}GB available`);
          }
        }
      } catch (error) {
        warnings.push('Could not determine available disk space');
      }

      // Create subdirectories
      try {
        await fs.ensureDir(path.join(dirPath, 'Movies'));
        await fs.ensureDir(path.join(dirPath, 'Series'));
        await fs.ensureDir(path.join(dirPath, '.metadata'));
      } catch (error) {
        errors.push(`Cannot create subdirectories: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Test write access with a small file
      try {
        const testFile = path.join(dirPath, '.offlinio-test');
        await fs.writeFile(testFile, 'test');
        await fs.remove(testFile);
      } catch (error) {
        errors.push('Cannot write test file to directory');
      }

    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      path: dirPath,
      errors,
      warnings,
      availableSpace,
      permissions
    };
  }

  /**
   * Save setup configuration
   */
  async saveSetupConfig(config: SetupConfig): Promise<void> {
    try {
      // Save all settings
      await this.prisma.setting.upsert({
        where: { key: 'storage_directory' },
        update: { value: config.storageDirectory },
        create: { key: 'storage_directory', value: config.storageDirectory }
      });

      await this.prisma.setting.upsert({
        where: { key: 'legal_accepted' },
        update: { value: config.legalAccepted.toString() },
        create: { key: 'legal_accepted', value: config.legalAccepted.toString() }
      });

      await this.prisma.setting.upsert({
        where: { key: 'legal_accepted_timestamp' },
        update: { value: new Date().toISOString() },
        create: { key: 'legal_accepted_timestamp', value: new Date().toISOString() }
      });

      // Store Real-Debrid token if provided
      if (config.realDebridToken) {
        await this.tokenManager.storeToken(config.realDebridToken);
      }

      // Mark setup as completed
      await this.prisma.setting.upsert({
        where: { key: 'setup_completed' },
        update: { value: 'true' },
        create: { key: 'setup_completed', value: 'true' }
      });

      logger.info('Setup configuration saved successfully');
    } catch (error) {
      logger.error('Failed to save setup configuration:', error);
      throw error;
    }
  }

  /**
   * Get current setup configuration
   */
  async getSetupConfig(): Promise<Partial<SetupConfig>> {
    try {
      const settings = await this.prisma.setting.findMany({
        where: {
          key: {
            in: ['storage_directory', 'legal_accepted', 'setup_completed']
          }
        }
      });

      const config: Partial<SetupConfig> = {};
      
      for (const setting of settings) {
        switch (setting.key) {
          case 'storage_directory':
            config.storageDirectory = setting.value;
            break;
          case 'legal_accepted':
            config.legalAccepted = setting.value === 'true';
            break;
          case 'setup_completed':
            config.setupCompleted = setting.value === 'true';
            break;
        }
      }

      return config;
    } catch (error) {
      logger.error('Failed to get setup configuration:', error);
      return {};
    }
  }

  /**
   * Reset setup (for testing or reconfiguration)
   */
  async resetSetup(): Promise<void> {
    try {
      await this.prisma.setting.deleteMany({
        where: {
          key: {
            in: ['setup_completed', 'storage_directory', 'legal_accepted', 'legal_accepted_timestamp']
          }
        }
      });

      await this.tokenManager.removeToken();
      
      logger.info('Setup configuration reset');
    } catch (error) {
      logger.error('Failed to reset setup:', error);
      throw error;
    }
  }

  /**
   * Validate complete setup
   */
  async validateSetup(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const config = await this.getSetupConfig();

      // Check legal acceptance
      if (!config.legalAccepted) {
        errors.push('Legal terms must be accepted');
      }

      // Check storage directory
      if (!config.storageDirectory) {
        errors.push('Storage directory must be configured');
      } else {
        const storageValidation = await this.validateStorageDirectory(config.storageDirectory);
        if (!storageValidation.valid) {
          errors.push(...storageValidation.errors.map(e => `Storage: ${e}`));
        }
      }

      // Check Real-Debrid token (optional but recommended)
      const hasValidToken = await this.tokenManager.isTokenValid();
      if (!hasValidToken) {
        errors.push('Real-Debrid token is missing or invalid (optional but recommended)');
      }

    } catch (error) {
      errors.push(`Setup validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
