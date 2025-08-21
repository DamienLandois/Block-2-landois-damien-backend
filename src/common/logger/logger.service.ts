import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as fs from 'fs';
import * as path from 'path';

// Interfaces pour le typage strict
interface AuthEventDetails {
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

interface SecurityEventDetails {
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  [key: string]: unknown;
}

interface LogStats {
  date: string;
  filesCount: number;
  files: string[];
  cleanupScheduled: boolean;
  retentionDays: number;
  error?: string;
}

@Injectable()
export class AppLoggerService implements LoggerService {
  private logger: Logger;

  constructor() {
    this.logger = createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
        format.printf((info) => {
          const meta = info.metadata ? this.sanitizeMeta(info.metadata) : {};
          return JSON.stringify({
            timestamp: info.timestamp,
            level: info.level,
            message: this.sanitizeMessage(info.message),
            ...meta,
          });
        }),
      ),
      defaultMeta: { service: 'spa-backend' },
      transports: [
        new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
        }),
        new DailyRotateFile({
          level: 'error',
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
        }),
        new DailyRotateFile({
          level: 'warn',
          filename: 'logs/security-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          format: format.combine(
            format.timestamp(),
            format.printf((info) => {
              const timestamp = String(info.timestamp);
              const level = String(info.level).toUpperCase();
              const message = this.sanitizeMessage(info.message);
              const metadata = JSON.stringify(
                this.sanitizeMeta(info.metadata || {}),
              );
              return `${timestamp} [${level}] ${message} ${metadata}`;
            }),
          ),
        }),
      ],
    });

    // Ajouter console en développement seulement si pas en production
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple(),
            format.printf((info) => {
              const timestamp = String(info.timestamp);
              const level = String(info.level);
              const message = this.sanitizeMessage(info.message);
              return `${timestamp} [${level}] ${message}`;
            }),
          ),
        }),
      );
    }

    // Nettoyage automatique des anciens logs
    this.scheduleLogCleanup();
  }

  //nettoyage automatique des logs anciens
  private scheduleLogCleanup(): void {
    setInterval(
      () => {
        this.cleanupOldLogs();
      },
      24 * 60 * 60 * 1000,
    ); // Une fois par jour
  }

  //suppression des logs de plus de 14 jours
  private cleanupOldLogs(): void {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      if (fs.existsSync(logDir)) {
        const files = fs.readdirSync(logDir);
        files.forEach((file) => {
          const filePath = path.join(logDir, file);
          const stats = fs.statSync(filePath);
          if (stats.mtime < fourteenDaysAgo) {
            fs.unlinkSync(filePath);
            this.logger.info(`Ancien fichier de log supprimé: ${file}`);
          }
        });
      }
    } catch (err) {
      this.logger.error('Erreur lors du nettoyage des logs:', err);
    }
  }

  //masque les données sensibles dans les messages de log
  private sanitizeMessage(message: unknown): string {
    if (typeof message !== 'string') {
      message = JSON.stringify(message);
    }

    // Masquer les mots de passe, tokens, emails sensibles
    return (message as string)
      .replace(
        /(?:password|token|secret|key|auth)[\s]*[:=][\s]*['"]*([^'",\s}]+)/gi,
        (match: string, value: string) => match.replace(value, '***MASKED***'),
      )
      .replace(/\$2[aby]\$[\d]+\$[./A-Za-z0-9]{53}/g, '***BCRYPT_HASH***')
      .replace(
        /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*/g,
        '***JWT_TOKEN***',
      );
  }

  //masque les données sensibles dans les métadonnées
  private sanitizeMeta(meta: unknown): Record<string, unknown> {
    if (!meta || typeof meta !== 'object') return {};

    const sanitized = { ...(meta as Record<string, unknown>) };
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'auth',
      'authorization',
    ];

    for (const key of Object.keys(sanitized)) {
      if (
        sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))
      ) {
        sanitized[key] = '***MASKED***';
      }
    }

    return sanitized;
  }

  log(message: unknown, context?: string): void {
    this.logger.info(this.sanitizeMessage(message), { context });
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.logger.error(this.sanitizeMessage(message), { trace, context });
  }

  warn(message: unknown, context?: string): void {
    this.logger.warn(this.sanitizeMessage(message), { context });
  }

  debug(message: unknown, context?: string): void {
    this.logger.debug(this.sanitizeMessage(message), { context });
  }

  verbose(message: unknown, context?: string): void {
    this.logger.verbose(this.sanitizeMessage(message), { context });
  }

  //log sécurisé pour les événements d'authentification
  logAuthEvent(
    event: string,
    userId?: string,
    details?: AuthEventDetails,
  ): void {
    this.logger.info('Authentication Event', {
      event,
      userId: userId || 'anonymous',
      ip: details?.ip || 'unknown',
      userAgent: details?.userAgent || 'unknown',
      timestamp: new Date().toISOString(),
    });
  }

  //log sécurisé pour les tentatives d'accès non autorisées
  logSecurityEvent(event: string, details: SecurityEventDetails): void {
    this.logger.warn('Security Event', {
      event,
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
      endpoint: details.endpoint || 'unknown',
      timestamp: new Date().toISOString(),
    });
  }

  //log d'audit pour traçabilité des actions critiques
  logAuditEvent(
    action: string,
    userId: string,
    resource: string,
    details?: unknown,
  ): void {
    this.logger.warn('Audit Event', {
      action,
      userId,
      resource,
      timestamp: new Date().toISOString(),
      details: this.sanitizeMeta(details),
    });
  }

  //log des erreurs de validation pour détecter les tentatives d'injection
  logValidationError(endpoint: string, error: string, details?: unknown): void {
    this.logger.warn('Validation Error', {
      endpoint,
      error,
      timestamp: new Date().toISOString(),
      details: this.sanitizeMeta(details),
    });
  }

  //statistiques des logs générés
  getLogStats(): LogStats {
    const today = new Date().toISOString().split('T')[0];
    try {
      const logDir = path.join(process.cwd(), 'logs');
      const todayFiles = fs
        .readdirSync(logDir)
        .filter(
          (file) => file.includes(today) && !file.includes('.audit.json'),
        );

      return {
        date: today,
        filesCount: todayFiles.length,
        files: todayFiles,
        cleanupScheduled: true,
        retentionDays: 14,
      };
    } catch {
      return {
        date: today,
        filesCount: 0,
        files: [],
        cleanupScheduled: true,
        retentionDays: 14,
        error: 'Unable to read log statistics',
      };
    }
  }
}
