import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, context, trace }) => {
  return `${timestamp} [${context || 'App'}] ${level}: ${message}${trace ? '\n' + trace : ''}`;
});

const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat,
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

export class WinstonLogger implements LoggerService {
  log(message: string, context?: string) {
    winstonLogger.info(message, { context });
  }
  error(message: string, trace?: string, context?: string) {
    winstonLogger.error(message, { context, trace });
  }
  warn(message: string, context?: string) {
    winstonLogger.warn(message, { context });
  }
  debug(message: string, context?: string) {
    winstonLogger.debug(message, { context });
  }
  verbose(message: string, context?: string) {
    winstonLogger.verbose(message, { context });
  }
}

export const logger = winstonLogger;
