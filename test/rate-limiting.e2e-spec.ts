import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

describe('Tests de Rate Limiting (Sécurité)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        // Réactivation du rate limiting pour ce test spécifique
        ThrottlerModule.forRoot([{
          name: 'short',
          ttl: 1000,
          limit: 3,
        }])
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        }
      ]
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('test-rate-limiting-1: Rate Limiting Protection', () => {
    it('should block requests after rate limit exceeded', async () => {
      const endpoint = '/auth/login';
      const payload = {
        email: 'nonexistent@test.com',
        password: 'anypassword123!'
      };

      //ok
      await request(app.getHttpServer())
        .post(endpoint)
        .send(payload)
        .expect(401); // Echec normal d'authentification

      //ok
      await request(app.getHttpServer())
        .post(endpoint)
        .send(payload)
        .expect(401);

      //ok (limite atteinte)
      await request(app.getHttpServer())
        .post(endpoint)
        .send(payload)
        .expect(401);

      //bloquée par rate limiting
      await request(app.getHttpServer())
        .post(endpoint)
        .send(payload)
        .expect(429);
    });

    it('should have consistent response times for different scenarios', async () => {
      const times: number[] = [];
      
      // Test avec emails différents pour éviter le rate limiting
      const testEmails = [
        'test1@rate-limit.com',
        'test2@rate-limit.com', 
        'test3@rate-limit.com'
      ];

      for (const email of testEmails) {
        const start = Date.now();
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: email,
            password: 'wrongpassword123!'
          });
        times.push(Date.now() - start);
        
        // Délai pour éviter le rate limiting entre les tests
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      
      // Vérifier que les temps sont dans une fourchette raisonnable
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const variance = maxTime - minTime;
      
      expect(variance).toBeLessThan(1000); // Variance < 1 seconde
    });
  });
});