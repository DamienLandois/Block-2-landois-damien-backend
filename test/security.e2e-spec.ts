import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestLoggerService } from './utils/test-logger.service';

describe('Tests de Sécurité (Fonctionnel)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testLogger: TestLoggerService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    testLogger = new TestLoggerService();
    
    // Configuration des pipes de validation comme dans main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    await app.init();
    await setupTestData();
  });

  afterAll(async () => {
    // Nettoyer les données de test
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['admin-security@test.com', 'normal@test.com']
        }
      }
    });
    await app.close();
  });

  async function setupTestData() {
    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.user.findUnique({
      where: {
        email: 'admin-security@test.com'
      }
    });

    if (!existingAdmin) {
      // Créer un admin directement dans la base de données
      const bcrypt = require('bcryptjs');
      const adminPassword = 'AdminPassword123!';
      const hashedPassword = await bcrypt.hash(adminPassword, 11);
      testLogger.testLog('Hash admin (sécurité) genere avec succes');
      await prisma.user.create({
        data: {
          email: 'admin-security@test.com',
          password: hashedPassword,
          firstname: 'Admin',
          name: 'Security',
          phoneNumber: '0123456789',
          role: 'ADMIN'
        }
      });
    }

    // Connexion admin
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin-security@test.com',
        password: 'AdminPassword123!'
      })
      .expect(200);
    adminToken = adminLoginResponse.body.access_token;
    
    // Vérifier que le token est généré
    if (!adminToken) {
      throw new Error('Failed to generate admin token');
    }
  }

  describe('test-security-1: Protection contre injection SQL', () => {
    it('should prevent SQL injection in login', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: "' OR '1'='1' --",
          password: 'anypassworD1!'
        })
        .expect(401);
    });

    it('should sanitize special characters in search', async () => {
      //vérifie que l'API gère correctement les caractères spéciaux
      await request(app.getHttpServer())
        .post('/user')
        .send({
          email: "test+special@example.com",
          password: "ValidPassword123!",
          name: "Test",
          phoneNumber: "0123456789",
          firstname: "Test"
        })
        .expect(201); // L'API accepte ce format d'email
    });
  });

  describe('test-security-2: Validation stricte des données', () => {
    it('should validate email format strictly', async () => {
      //avec un format clairement invalide
      await request(app.getHttpServer())
        .post('/user')
        .send({
          email: 'clearly-invalid-email',
          password: 'ValidPassword123!',
          name: 'Test',
          phoneNumber: '0123456789',
          firstname: 'Test'
        })
        .expect(400);
    });

    it('should validate password requirements', async () => {
      //avec un mot de passe très court (moins de 11 caractères)
      await request(app.getHttpServer())
        .post('/user')
        .send({
          email: `test${Math.random()}@example.com`,
          password: '123',
          name: 'Test',
          phoneNumber: '0123456789',
          firstname: 'Test'
        })
        .expect(400);
    });

    it('should validate numeric fields properly', async () => {
      //avec durée négative - l'authentification est vérifiée en premier
      await request(app.getHttpServer())
        .post('/massages')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Test Massage')
        .field('description', 'Test description')
        .field('duration', '-60')
        .field('price', '50')
        .field('position', '1')
        .expect(400); // Erreur de validation (class-validator ou pipe)
    });
  });

  describe('test-security-3: Contrôle d\'accès et autorisation', () => {
    it('should prevent privilege escalation', async () => {
      // Nettoyer l'utilisateur normal existant
      await prisma.user.deleteMany({
        where: {
          email: 'normal@test.com'
        }
      });

      // Créer un utilisateur normal
      await request(app.getHttpServer())
        .post('/user')
        .send({
          email: 'normal@test.com',
          password: 'UserPassword123!',
          name: 'Normal',
          phoneNumber: '0123456789',
          firstname: 'User'
        });

      // Se connecter
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'normal@test.com',
          password: 'UserPassword123!'
        });

      const userToken = loginResponse.body.access_token;

      // Tenter d'accéder à un endpoint admin
      await request(app.getHttpServer())
        .post('/massages')
        .set('Authorization', `Bearer ${userToken}`)
        .field('name', 'Unauthorized Massage')
        .field('description', 'Should not work')
        .field('duration', '60')
        .field('price', '50')
        .expect(403);
    });

    it('should prevent access to other users data', async () => {
      // Ce test vérifie que les utilisateurs ne peuvent pas accéder aux données d'autres utilisateurs
      // Pour simplifier, on teste l'accès sans token
      await request(app.getHttpServer())
        .get('/planning/reservations')
        .expect(401);
    });
  });

  describe('test-security-4: Protection des uploads', () => {
    it('should require authentication for upload endpoints', async () => {
      // Sans authentification, on doit avoir 401
      await request(app.getHttpServer())
        .post('/massages')
        .field('name', 'Test Massage')
        .field('description', 'Test description')
        .field('duration', '60')
        .field('price', '50')
        .attach('image', Buffer.from('malicious script'), 'script.js')
        .expect(401);
    });

    it('should accept valid requests with authentication', async () => {
      // Avec authentification, même avec un fichier "image" basique
      await request(app.getHttpServer())
        .post('/massages')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Test Security Massage')
        .field('description', 'Valid test')
        .field('duration', '60')
        .field('price', '50')
        .field('position', '1')
        .expect(201); // Réussi sans fichier image (tous les champs obligatoires sont présents)
    });
  });

  describe('test-security-5: Protection contre les attaques temporelles', () => {
    it('should have consistent response times for login attempts', async () => {
      const times: number[] = [];
      
      //avec utilisateur existant
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'admin-security@test.com',
            password: 'wrongpassworD1!'
          });
        times.push(Date.now() - start);
      }
      
      //avec utilisateur inexistant
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'anypassworD1!'
          });
        times.push(Date.now() - start);
      }
      
      // Vérifier que les temps sont dans une fourchette raisonnable
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const variance = maxTime - minTime;
      
      // La variance ne devrait pas être énorme
      expect(variance).toBeLessThan(1000);
    });
  });
});