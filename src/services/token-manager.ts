/**
 * Secure Token Management Service
 * 
 * Provides secure storage and validation for Real-Debrid API tokens
 * using system keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
 */

import { logger } from '../utils/logger.js';
import { PrismaClient } from '@prisma/client';

// Fallback to environment variable if keytar is not available
let keytar: typeof import('keytar') | null = null;

try {
  keytar = await import('keytar');
} catch (error) {
  logger.warn('Keytar not available, falling back to environment variable storage');
}

export interface TokenValidationResult {
  valid: boolean;
  error?: string;
  accountInfo?: {
    username: string;
    email: string;
    type: string;
    premium: number;
    expiration: string;
  };
}

export class TokenManager {
  private prisma: PrismaClient;
  private readonly SERVICE_NAME = 'offlinio';
  private readonly ACCOUNT_NAME = 'real-debrid-token';

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Store Real-Debrid API token securely
   */
  async storeToken(token: string): Promise<void> {
    try {
      // Validate token first
      const validation = await this.validateToken(token);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid token');
      }

      if (keytar) {
        // Store in system keychain
        await keytar.setPassword(this.SERVICE_NAME, this.ACCOUNT_NAME, token);
        logger.info('Real-Debrid token stored securely in system keychain');
      } else {
        // Fallback: Store in database (less secure, but functional)
        await this.prisma.setting.upsert({
          where: { key: 'real_debrid_token' },
          update: { value: this.encryptToken(token) },
          create: { key: 'real_debrid_token', value: this.encryptToken(token) }
        });
        logger.warn('Real-Debrid token stored in database (install keytar for better security)');
      }

      // Store account info for quick access
      if (validation.accountInfo) {
        await this.prisma.setting.upsert({
          where: { key: 'real_debrid_account' },
          update: { value: JSON.stringify(validation.accountInfo) },
          create: { key: 'real_debrid_account', value: JSON.stringify(validation.accountInfo) }
        });
      }
    } catch (error) {
      logger.error('Failed to store token:', error);
      throw error;
    }
  }

  /**
   * Retrieve Real-Debrid API token
   */
  async getToken(): Promise<string | null> {
    try {
      if (keytar) {
        // Try system keychain first
        const token = await keytar.getPassword(this.SERVICE_NAME, this.ACCOUNT_NAME);
        if (token) {
          return token;
        }
      }

      // Fallback: Try database
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'real_debrid_token' }
      });

      if (setting?.value) {
        return this.decryptToken(setting.value);
      }

      // Last resort: Environment variable
      if (process.env.REAL_DEBRID_TOKEN) {
        logger.warn('Using Real-Debrid token from environment variable');
        return process.env.REAL_DEBRID_TOKEN;
      }

      return null;
    } catch (error) {
      logger.error('Failed to retrieve token:', error);
      return null;
    }
  }

  /**
   * Validate Real-Debrid API token
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const response = await fetch('https://api.real-debrid.com/rest/1.0/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { valid: false, error: 'Invalid API token' };
        }
        if (response.status === 403) {
          return { valid: false, error: 'API token expired or revoked' };
        }
        return { valid: false, error: `API error: ${response.status}` };
      }

      const accountInfo = await response.json() as any;
      
      return {
        valid: true,
        accountInfo: {
          username: accountInfo.username || 'Unknown',
          email: accountInfo.email || 'Unknown',
          type: accountInfo.type || 'free',
          premium: accountInfo.premium || 0,
          expiration: accountInfo.expiration || 'Unknown'
        }
      };
    } catch (error) {
      logger.error('Token validation failed:', error);
      return { valid: false, error: 'Network error during validation' };
    }
  }

  /**
   * Remove stored token
   */
  async removeToken(): Promise<void> {
    try {
      if (keytar) {
        await keytar.deletePassword(this.SERVICE_NAME, this.ACCOUNT_NAME);
      }

      await this.prisma.setting.deleteMany({
        where: {
          key: { in: ['real_debrid_token', 'real_debrid_account'] }
        }
      });

      logger.info('Real-Debrid token removed');
    } catch (error) {
      logger.error('Failed to remove token:', error);
      throw error;
    }
  }

  /**
   * Check if token is configured and valid
   */
  async isTokenValid(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;

    const validation = await this.validateToken(token);
    return validation.valid;
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<any> {
    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'real_debrid_account' }
      });

      if (setting?.value) {
        return JSON.parse(setting.value);
      }

      return null;
    } catch (error) {
      logger.error('Failed to get account info:', error);
      return null;
    }
  }

  /**
   * Basic encryption for database storage (fallback only)
   */
  private encryptToken(token: string): string {
    // Simple base64 encoding (not cryptographically secure, but better than plaintext)
    // This is only used when keytar is not available
    return Buffer.from(token).toString('base64');
  }

  /**
   * Basic decryption for database storage (fallback only)
   */
  private decryptToken(encryptedToken: string): string {
    try {
      return Buffer.from(encryptedToken, 'base64').toString('utf8');
    } catch (error) {
      throw new Error('Failed to decrypt token');
    }
  }
}