import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as request from 'supertest';
import { TestLoggerService } from './utils/test-logger.service';

describe('Workflow Complet de Réservation (Fonctionnel)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testLogger: TestLoggerService;
  let userToken: string;
  let massageId: string;
  let timeSlotId: string;

  // Constantes pour les tests
  const TEST_DATE = '2025-08-25';
  const ADMIN_EMAIL = 'admin-workflow@test.com';
  const CLIENT_EMAIL = 'client@test.com';
  const MASSAGE_NAME = 'Massage Global';
  const MASSAGE_DURATION = 60;
  const BREAK_TIME_MINUTES = 30;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    testLogger = new TestLoggerService();
    
    app.useGlobalPipes(
      new (require('@nestjs/common').ValidationPipe)({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );
    await app.init();

    //Setup des données de test dans la bdd (notament la création d'un admin -> sinon impossible d'utilisé les route admin')
    await setupTestData();
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  async function cleanDatabase() {
    try {
      // Supprimer spécifiquement les données créées dans setupTestData (même ordre inverse)
      await prisma.booking.deleteMany();
      await prisma.timeSlot.deleteMany();
      
      await prisma.massage.deleteMany({
        where: {
          name: MASSAGE_NAME
        }
      });
      
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [ADMIN_EMAIL, CLIENT_EMAIL, 'test-valid@valid.com']
          }
        }
      });
      
      console.log('🧹 Nettoyé les données de test spécifiques');
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error.message);
    }
  }

  
  //Nettoyage explicite de la base avant chaque création d'utilisateur
  async function setupTestData() {
    await prisma.booking.deleteMany();
    await prisma.timeSlot.deleteMany();
    await prisma.massage.deleteMany();
    await prisma.user.deleteMany();

    //Créer un admin directement dans la base de données (seul moyen d'ajouter le premier admin actuellement)
    const bcrypt = require('bcryptjs');
    const adminPassword = 'MotdepasseAdmin123!';
    const hashedPassword = await bcrypt.hash(adminPassword, 11);
    testLogger.testLog('Hash admin genere avec succes');
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        password: hashedPassword,
        firstname: 'Admin',
        name: 'Workflow',
        phoneNumber: '0123456789',
        role: 'ADMIN'
      }
    });

    //Connexion admin
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: ADMIN_EMAIL,
        password: adminPassword
      });
    adminToken = adminLoginResponse.body.access_token;
    testLogger.testTokenEvent('Admin', !!adminToken);
    testLogger.testHttpStatus('Admin Login', adminLoginResponse.status);
    testLogger.testAuthEvent('Admin Login', !!adminToken);

    //Créer un utilisateur avec le role USER (au cas où la route de création d'utilisateur ne fonctionne pas)
    await request(app.getHttpServer())
      .post('/user')
      .send({
        email: CLIENT_EMAIL,
        password: 'ClientPassword123!',
        firstname: 'François',
        name: 'Gontran',
        phoneNumber: '0123456789'
      });

    //Connexion utilisateur
    const userLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: CLIENT_EMAIL,
        password: 'ClientPassword123!'
      });
    userToken = userLoginResponse.body.access_token;
    
    testLogger.testTokenEvent('User', !!userToken);

    //Créer un massage de test directement via Prisma (au cas où la route de création de massage ne fonctionne pas)
    const massage = await prisma.massage.create({
      data: {
        name: MASSAGE_NAME,
        description: 'Massage pour tous les tests',
        duration: MASSAGE_DURATION,
        price: 65
      }
    });
    
    massageId = massage.id;

    //Créer un créneau horaire de test (au cas où la route de création de créneau ne fonctionne pas)
    const timeSlotResponse = await request(app.getHttpServer())
      .post('/planning/creneaux')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        startTime: '2025-08-25T09:00:00.000Z',
        endTime: '2025-08-25T17:00:00.000Z'
      })
      .expect(201);
    
    timeSlotId = timeSlotResponse.body.id;

    testLogger.testTokenEvent('Admin', !!adminToken);
    testLogger.testTokenEvent('User', !!userToken);
  }

  describe('test-fonctionnel-1: Workflow complet de réservation', () => {
    let testBookingId: string;

    afterEach(async () => {
      // Nettoyer les bookings créés dans ce test
      if (testBookingId) {
        await prisma.booking.deleteMany({
          where: { id: testBookingId }
        });
      }
    });

    it('should complete full booking workflow successfully', async () => {
      //l'utilisateur consulte les massages disponibles
      const massagesResponse = await request(app.getHttpServer())
        .get('/massages')
        .expect(200);

      expect(massagesResponse.body.length).toBeGreaterThan(0);
      const massage = massagesResponse.body.find((m: any) => m.id === massageId);
      expect(massage).toBeDefined();
      expect(massage.name).toBe('Massage Global');

      //l'utilisateur consulte les créneaux disponibles
      const timeSlotsResponse = await request(app.getHttpServer())
        .get('/planning/creneaux')
        .expect(200);

      expect(timeSlotsResponse.body.length).toBeGreaterThan(0);
      const timeSlot = timeSlotsResponse.body.find((ts: any) => ts.id === timeSlotId);
      expect(timeSlot).toBeDefined();
      expect(timeSlot.isActive).toBe(true);

      //l'utilisateur fait une réservation
      const bookingResponse = await request(app.getHttpServer())
        .post('/planning/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          massageId: massageId,
          timeSlotId: timeSlotId,
          startTime: '2025-08-25T10:00:00.000Z',
          notes: 'Première réservation test'
        })
        .expect(201);

      testBookingId = bookingResponse.body.id; // Tracker pour nettoyage
      expect(bookingResponse.body.status).toBe('PENDING');
      expect(bookingResponse.body.startTime).toBe('2025-08-25T10:00:00.000Z');
      expect(bookingResponse.body.endTime).toBe('2025-08-25T11:00:00.000Z');

      //l'utilisateur consulte ses réservations
      const myBookingsResponse = await request(app.getHttpServer())
        .get('/planning/mes-rendez-vous')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(myBookingsResponse.body).toHaveLength(1);
      expect(myBookingsResponse.body[0].id).toBe(bookingResponse.body.id);

      //l'admin consulte toutes les réservations
      const allBookingsResponse = await request(app.getHttpServer())
        .get('/planning/reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(allBookingsResponse.body).toHaveLength(1);
      expect(allBookingsResponse.body[0].user.email).toBe('client@test.com');
    });
  });

  describe('test-fonctionnel-2: Gestion des conflits horaires', () => {
    let firstBookingId: string;

    beforeEach(async () => {
      //créer une première réservation
      const firstBookingResponse = await request(app.getHttpServer())
        .post('/planning/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          massageId: massageId,
          timeSlotId: timeSlotId,
          startTime: '2025-08-25T14:00:00.000Z',
          notes: 'Première réservation pour test conflit'
        })
        .expect(201);

      firstBookingId = firstBookingResponse.body.id;
    });

    afterEach(async () => {
      //nettoyer les réservations de test
      if (firstBookingId) {
        await request(app.getHttpServer())
          .delete(`/planning/reservations/${firstBookingId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }
      
      // Nettoyer aussi toute réservation qui aurait pu être créée malgré les erreurs
      await prisma.booking.deleteMany({
        where: {
          notes: {
            in: ['Tentative de conflit direct', 'Tentative avec pause insuffisante', 'Réservation avec pause suffisante']
          }
        }
      });
    });

    it('should reject booking with direct time conflict', async () => {
      await request(app.getHttpServer())
        .post('/planning/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          massageId: massageId,
          timeSlotId: timeSlotId,
          startTime: '2025-08-25T14:30:00.000Z', //ici -> conflit avec 14h-15h
          notes: 'Tentative de conflit direct'
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('Conflit d\'horaire');
        });
    });

    it('should reject booking with insufficient break time', async () => {
      //avec seulement 15 minutes de pause (insuffisant)
      await request(app.getHttpServer())
        .post('/planning/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          massageId: massageId,
          timeSlotId: timeSlotId,
          startTime: '2025-08-25T15:15:00.000Z', //ici seulement 15 min de pause après le massage de 14h-15h (30 obligatoire)
          notes: 'Tentative avec pause insuffisante'
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('30 minutes de pause minimum');
        });
    });

    it('should accept booking with sufficient break time', async () => {
      //avec 45 minutes de pause (suffisant)
      const successfulBookingResponse = await request(app.getHttpServer())
        .post('/planning/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          massageId: massageId,
          timeSlotId: timeSlotId,
          startTime: '2025-08-25T15:45:00.000Z', //45 min de pause après le massage de 14h-15h
          notes: 'Réservation avec pause suffisante'
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.startTime).toBe('2025-08-25T15:45:00.000Z');
          expect(res.body.endTime).toBe('2025-08-25T16:45:00.000Z');
        });
      
      // Nettoyer immédiatement ce booking réussi
      await request(app.getHttpServer())
        .delete(`/planning/reservations/${successfulBookingResponse.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('test-fonctionnel-3: Gestion des permissions', () => {
    it('should prevent user from accessing admin endpoints', async () => {
      //Utilisateur standard ne peut pas créer de massage
      await request(app.getHttpServer())
        .post('/massages')
        .set('Authorization', `Bearer ${userToken}`)
        .field('name', 'Massage Interdit')
        .field('duration', '30')
        .field('price', '40')
        .expect(403);

      //Utilisateur standard ne peut pas créer de créneau
      await request(app.getHttpServer())
        .post('/planning/creneaux')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          startTime: '2025-08-26T09:00:00.000Z',
          endTime: '2025-08-26T17:00:00.000Z'
        })
        .expect(403);

      //Utilisateur standard ne peut pas voir toutes les réservations
      await request(app.getHttpServer())
        .get('/planning/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should prevent access without authentication', async () => {
      //Pas d'accès aux réservations sans token
      await request(app.getHttpServer())
        .get('/planning/mes-rendez-vous')
        .expect(401);

      //Pas d'accès à la création de réservation sans token
      await request(app.getHttpServer())
        .post('/planning/reservations')
        .send({
          massageId: massageId,
          timeSlotId: timeSlotId,
          startTime: '2025-08-25T12:00:00.000Z'
        })
        .expect(401);
    });
  });

  describe('test-fonctionnel-4: Validation des données', () => {
    afterAll(async () => {
      // Nettoyer les utilisateurs créés pendant ce test
      await prisma.user.deleteMany({
        where: {
          email: {
            in: ['test1@valid.com', 'test2@valid.com', 'test3@valid.com', 'test4@valid.com', 'test5@valid.com', 'test-valid@valid.com']
          }
        }
      });
    });

    it('should validate booking data properly', async () => {
      //avec massageId invalide
      await request(app.getHttpServer())
        .post('/planning/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          massageId: 'invalid-id',
          timeSlotId: timeSlotId,
          startTime: '2025-08-25T12:00:00.000Z'
        })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('massage n\'existe pas');
        });

      //avec timeSlotId invalide
      await request(app.getHttpServer())
        .post('/planning/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          massageId: massageId,
          timeSlotId: 'invalid-slot-id',
          startTime: '2025-08-25T12:00:00.000Z'
        })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('créneau n\'est pas disponible');
        });

      //avec heure hors limites du créneau
      await request(app.getHttpServer())
        .post('/planning/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          massageId: massageId,
          timeSlotId: timeSlotId,
          startTime: '2025-08-25T16:30:00.000Z' //Se terminerait à 17h30, hors du créneau 9h-17h
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('créneau se termine à');
        });
    });

    it('should validate user creation data', async () => {
      //avec email invalide
      const response1 = await request(app.getHttpServer())
        .post('/user')
        .send({
          email: 'clearly-invalid-email',
          password: 'ValidPassword123!',
          firstname: 'Test',
          name: 'Test',
          phoneNumber: '0123456789'
        });
      
      //doit échouer avec email invalide
      expect(response1.status).toBe(400);
      expect(response1.body.message).toEqual(expect.arrayContaining([expect.stringContaining('email')]));

      //mot de passe trop court (moins de 11 caractères)
      const response2 = await request(app.getHttpServer())
        .post('/user')
        .send({
          email: 'test1@valid.com',
          password: 'Short123!',
          firstname: 'Test',
          name: 'Test',
          phoneNumber: '0123456789'
        });
      
      expect(response2.status).toBe(400);
      expect(response2.body.message).toEqual(expect.arrayContaining([expect.stringContaining('11 caractères')]));

      
      

      //mot de passe sans majuscule
      const response3 = await request(app.getHttpServer())
        .post('/user')
        .send({
          email: 'test2@valid.com',
          password: 'longenough123!',
          firstname: 'Test',
          name: 'Test',
          phoneNumber: '0123456789'
        });
      
      expect(response3.status).toBe(400);
      expect(response3.body.message).toEqual(expect.arrayContaining([expect.stringContaining('minuscule')]));

      
      

      //mot de passe sans minuscule
      const response4 = await request(app.getHttpServer())
        .post('/user')
        .send({
          email: 'test3@valid.com',
          password: 'LONGENOUGH123!',
          firstname: 'Test',
          name: 'Test',
          phoneNumber: '0123456789'
        });
      
      expect(response4.status).toBe(400);
      expect(response4.body.message).toEqual(expect.arrayContaining([expect.stringContaining('majuscule')]));

      
      

      //mot de passe sans symbole
      const response5 = await request(app.getHttpServer())
        .post('/user')
        .send({
          email: 'test4@valid.com',
          password: 'LongEnough123',
          firstname: 'Test',
          name: 'Test',
          phoneNumber: '0123456789'
        });
      
      expect(response5.status).toBe(400);
      expect(response5.body.message).toEqual(expect.arrayContaining([expect.stringContaining('symbole')]));

      
      

      //mot de passe sans chiffre
      const response6 = await request(app.getHttpServer())
        .post('/user')
        .send({
          email: 'test5@valid.com',
          password: 'LongEnoughAbc!',
          firstname: 'Test',
          name: 'Test',
          phoneNumber: '0123456789'
        });
      
      expect(response6.status).toBe(400);
      expect(response6.body.message).toEqual(expect.arrayContaining([expect.stringContaining('chiffre')]));

      
      

      //mot de passe valide
      const response7 = await request(app.getHttpServer())
        .post('/user')
        .send({
          email: 'test-valid@valid.com',
          password: 'ValidPassword123!',
          firstname: 'Test',
          name: 'Valid',
          phoneNumber: '0123456789'
        });
      
      expect(response7.status).toBe(201);
      expect(response7.body.email).toBe('test-valid@valid.com');
    });
  });

  describe('test-fonctionnel-5: Cycle de vie des réservations', () => {
    let bookingId: string;

    it('should handle complete booking lifecycle', async () => {
      //création de la réservation
      const createResponse = await request(app.getHttpServer())
        .post('/planning/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          massageId: massageId,
          timeSlotId: timeSlotId,
          startTime: '2025-08-25T13:00:00.000Z',
          notes: 'cycle de vie'
        })
        .expect(201);

      bookingId = createResponse.body.id;
      expect(createResponse.body.status).toBe('PENDING');

      //modification
      const updateResponse = await request(app.getHttpServer())
        .put(`/planning/reservations/${bookingId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          notes: 'Notes modifiées'
        })
        .expect(200);

      expect(updateResponse.body.notes).toBe('Notes modifiées');

      //annulation
      const cancelResponse = await request(app.getHttpServer())
        .delete(`/planning/reservations/${bookingId}/annuler`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(cancelResponse.body.status).toBe('CANCELLED');

      //suppression (Admin seulement)
      await request(app.getHttpServer())
        .delete(`/planning/reservations/${bookingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      //vérification que la réservation n'existe plus
      await request(app.getHttpServer())
        .put(`/planning/reservations/${bookingId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ notes: 'Test' })
        .expect(404);
    });
  });
});