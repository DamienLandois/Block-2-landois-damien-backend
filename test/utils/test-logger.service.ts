import { AppLoggerService } from '../../src/common/logger/logger.service';

//service de logs spécialement dédié aux tests
export class TestLoggerService extends AppLoggerService {
  
  //sécurisé pour les tests
  testLog(message: string, context?: string): void {
    this.log(`[TEST] ${message}`, context || 'TestSuite');
  }

  //pour les événements d'authentification pendant les test
  testAuthEvent(event: string, success: boolean): void {
    this.testLog(`Auth Event: ${event} - ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  //pour les tokens sans exposer le contenu pendant les test
  testTokenEvent(tokenType: string, exists: boolean): void {
    this.testLog(`Token ${tokenType}: ${exists ? 'GENERATED' : 'MISSING'}`);
  }

  //log pour les status HTTP
  testHttpStatus(endpoint: string, status: number): void {
    this.testLog(`HTTP ${endpoint}: ${status}`);
  }
}