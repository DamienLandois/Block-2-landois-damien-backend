import { Test, TestingModule } from '@nestjs/testing';
import { PlanningService } from './planning.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateTimeSlotDto, CreateBookingDto } from './dto';

describe('PlanningService', () => {
  let service: PlanningService;
  let prismaService: jest.Mocked<PrismaService>;
  let emailService: jest.Mocked<EmailService>;

  const sophieClient = {
    id: 'user-bolle-123',
    name: 'Bolle',
    firstname: 'Sophie',
    email: 'sophie.bolle@gmail.com',
    role: 'USER',
  };

  const relaxationMassage = {
    id: 'massage-detente-654',
    title: 'massage de relaxation',
    duration: 90,
    price: 85,
  };

  const morningSlot = {
    id: 'slot-matin-254',
    startTime: new Date('2025-08-22T09:30:00Z'),
    endTime: new Date('2025-08-22T11:00:00Z'),
    isActive: true,
    bookings: [],
  };

  const sophieBooking = {
    id: 'rdv-sophie-001',
    userId: 'user-bolle-123',
    massageId: 'massage-detente-654',
    timeSlotId: 'slot-matin-254',
    notes: `j'apporte des gateaux`,
    status: 'CONFIRMED',
    createdAt: new Date('2025-08-17T14:30:00.000Z'),
    updatedAt: new Date('2025-08-17T14:30:00.000Z'),
    user: sophieClient,
    massage: relaxationMassage,
    timeSlot: morningSlot,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanningService,
        {
          provide: PrismaService,
          useValue: {
            timeSlot: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            booking: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
            massage: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendConfirmationClient: jest.fn(),
            sendAnnulationClient: jest.fn(),
            notifyAdmins: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PlanningService>(PlanningService);
    prismaService = module.get(PrismaService);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('creerNouveauCreneau', () => {
    const newTimeSlot: CreateTimeSlotDto = {
      startTime: '2025-08-25T14:30:00.000Z',
      endTime: '2025-08-25T16:00:00.000Z',
    };

    beforeEach(() => {
      // On simule qu'aucun conflit de créneau n'est trouvé
      (prismaService.timeSlot.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.timeSlot.create as jest.Mock).mockResolvedValue(
        morningSlot,
      );
    });

    // Vérifie la création d'un nouveau créneau sans conflit
    it('should create new time slot when no conflicts exist', async () => {
      const result = await service.creerNouveauCreneau(newTimeSlot);

      // On vérifie que le créneau est bien créé avec les bonnes données
      expect(prismaService.timeSlot.create).toHaveBeenCalledWith({
        data: {
          startTime: new Date(newTimeSlot.startTime),
          endTime: new Date(newTimeSlot.endTime),
        },
      });
      expect(result).toEqual(morningSlot);
    });
  });

  // Test du processus complet de réservation
  describe('reserverMassage', () => {
    const bookingRequest: CreateBookingDto = {
      massageId: 'massage-detente-654',
      timeSlotId: 'slot-matin-254',
      startTime: '2025-08-22T09:30:00.000Z',
      notes: 'mal de dos, jpp',
    };

    it('processes a new booking correctly', async () => {
      // On prépare tous les mocks nécessaires pour la réservation
      (prismaService.timeSlot.findUnique as jest.Mock).mockResolvedValue(
        morningSlot,
      );
      (prismaService.massage.findUnique as jest.Mock).mockResolvedValue(
        relaxationMassage,
      );
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        sophieClient,
      );
      (prismaService.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.booking.create as jest.Mock).mockResolvedValue(
        sophieBooking,
      );

      const result = await service.reserverMassage(
        'user-bolle-123',
        bookingRequest,
      );

      // On s'assure que tous les services sont bien appelés
      expect(prismaService.booking.create).toHaveBeenCalled();
      expect(emailService.sendConfirmationClient).toHaveBeenCalled();
      expect(emailService.notifyAdmins).toHaveBeenCalled();
      expect(result).toEqual(sophieBooking);
    });
  });

  // Vérifie la récupération des rendez-vous d'un client
  describe('voirMesRendezVous', () => {
    it('retrieves client appointments correctly', async () => {
      (prismaService.booking.findMany as jest.Mock).mockResolvedValue([
        sophieBooking,
      ]);

      const sophieAppointments =
        await service.voirMesRendezVous('user-bolle-123');

      // On s'assure que la méthode Prisma est appelée et retourne les bons RDV
      expect(prismaService.booking.findMany).toHaveBeenCalled();
      expect(sophieAppointments).toEqual([sophieBooking]);
    });
  });

  // Test de récupération de tous les créneaux disponibles
  describe('obtenirTousLesCreneaux', () => {
    it('lists all available time slots', async () => {
      (prismaService.timeSlot.findMany as jest.Mock).mockResolvedValue([
        morningSlot,
      ]);

      const availableSlots = await service.obtenirTousLesCreneaux();

      // Vérification que la liste des créneaux est bien récupérée
      expect(prismaService.timeSlot.findMany).toHaveBeenCalled();
      expect(availableSlots).toEqual([morningSlot]);
    });
  });
});
