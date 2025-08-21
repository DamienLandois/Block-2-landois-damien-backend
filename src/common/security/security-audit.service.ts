import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../logger/logger.service';

@Injectable()
export class SecurityAuditService {
  constructor(private readonly logger: AppLoggerService) {}

  //log d'événement d'authentification
  logUserLogin(
    userId: string,
    ip: string,
    userAgent: string,
    success: boolean,
  ): void {
    this.logger.logAuthEvent(
      success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      userId,
      { ip, userAgent },
    );
  }

  //log d'événement de sécurité suspect
  logSuspiciousActivity(ip: string, endpoint: string, reason: string): void {
    this.logger.logSecurityEvent('SUSPICIOUS_ACTIVITY', {
      ip,
      endpoint,
      reason,
    });
  }

  //log d'audit pour actions critiques
  logCriticalAction(action: string, userId: string, resource: string): void {
    this.logger.logAuditEvent(action, userId, resource, {
      timestamp: new Date().toISOString(),
    });
  }

  //log d'erreur de validation
  logInvalidInput(endpoint: string, error: string): void {
    this.logger.logValidationError(endpoint, error, {
      inputReceived: true, // Ne pas logger l'input réel pour sécurité
    });
  }

  //obtenir les statistiques des logs
  getLogStatistics(): unknown {
    return this.logger.getLogStats();
  }
}
