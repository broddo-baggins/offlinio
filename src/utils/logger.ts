/**
 * Logger Configuration
 * 
 * Winston-based logging system for Offlinio with:
 * - File and console output
 * - Different log levels
 * - Structured logging
 * - Privacy-conscious logging (no URLs, hashes, or titles)
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for privacy-conscious logging
const privacyFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  // Remove sensitive data from logs
  const sanitizedMeta = { ...meta };
  
  // Remove URLs, hashes, and potentially sensitive data
  Object.keys(sanitizedMeta).forEach(key => {
    const value = sanitizedMeta[key];
    if (typeof value === 'string') {
      // Remove URLs
      if (value.includes('http://') || value.includes('https://') || value.includes('magnet:')) {
        sanitizedMeta[key] = '[URL_REDACTED]';
      }
      // Remove potential hashes (long hex strings)
      if (/^[a-f0-9]{32,}$/i.test(value)) {
        sanitizedMeta[key] = '[HASH_REDACTED]';
      }
      // Remove file paths that might contain sensitive info
      if (value.includes('/') || value.includes('\\')) {
        sanitizedMeta[key] = '[PATH_REDACTED]';
      }
    }
  });

  const metaString = Object.keys(sanitizedMeta).length > 0 
    ? ' ' + JSON.stringify(sanitizedMeta) 
    : '';

  return `${timestamp} [${level.toUpperCase()}] ${message}${metaString}`;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    privacyFormat
  ),
  defaultMeta: { 
    service: 'offlinio',
    version: '0.1.0'
  },
  transports: [
    // Console output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        privacyFormat
      )
    }),

    // File output for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'offlinio.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),

    // Separate error log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log')
    })
  ],

  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log')
    })
  ]
});

// Add request ID tracking for better debugging
let requestCounter = 0;

export function generateRequestId(): string {
  return `req_${Date.now()}_${++requestCounter}`;
}

export function createRequestLogger(requestId: string) {
  return {
    debug: (message: string, meta?: any) => logger.debug(message, { requestId, ...meta }),
    info: (message: string, meta?: any) => logger.info(message, { requestId, ...meta }),
    warn: (message: string, meta?: any) => logger.warn(message, { requestId, ...meta }),
    error: (message: string, meta?: any) => logger.error(message, { requestId, ...meta })
  };
}

// Privacy-conscious logging helpers
export function logDownloadProgress(contentId: string, progress: number): void {
  logger.info('Download progress updated', {
    contentId: contentId.substring(0, 8) + '...', // Only log partial ID
    progress,
    type: 'progress_update'
  });
}

export function logUserAction(action: string, details?: Record<string, any>): void {
  // Log user actions without sensitive data
  const sanitizedDetails = details ? { ...details } : {};
  
  // Remove sensitive fields
  delete sanitizedDetails.url;
  delete sanitizedDetails.hash;
  delete sanitizedDetails.magnet;
  delete sanitizedDetails.filePath;
  
  logger.info('User action', {
    action,
    timestamp: new Date().toISOString(),
    ...sanitizedDetails
  });
}

// Development helpers
if (process.env.NODE_ENV === 'development') {
  logger.debug('Logger initialized in development mode');
  logger.debug(`Log level: ${logger.level}`);
  logger.debug(`Logs directory: ${logsDir}`);
}

// Production settings
if (process.env.NODE_ENV === 'production') {
  logger.info('Logger initialized in production mode');
  // Reduce console logging in production
  const consoleTransport = logger.transports.find(t => (t as any).name === 'console');
  if (consoleTransport) {
    logger.remove(consoleTransport);
  }
}
