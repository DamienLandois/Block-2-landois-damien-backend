import { Test, TestingModule } from '@nestjs/testing';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateTimeSlotDto,
  CreateBookingDto,
  UpdateTimeSlotDto,
  UpdateBookingDto,
} from './dto';

describe('PlanningController', () => {
  let controller: PlanningController;
  let service: jest.Mocked<PlanningService>;

  const afternoonSlot = {
    id: 'slot-140823-452',
    startTime: new Date('2025-08-23T14:30:00.000Z'),
    endTime: new Date('2025-08-23T16:00:00.000Z'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    bookings: [],
  };

  const theoBooking = {
    id: 'booking-theo-456',
    userId: 'user-theo-789',
    massageId: 'massage-pierre-chaude',
    timeSlotId: 'slot-140823-452',
    startTime: new Date('2025-08-23T14:45:00.000Z'),
    endTime: new Date('2025-08-23T16:15:00.000Z'),
    status: 'CONFIRMED' as const,
    notes: 'Avec du métal en arriere fond',
    createdAt: new Date(),
    updatedAt: new Date(),
    timeSlot: afternoonSlot,
    user: {
      id: 'user-theo-789',
      name: 'Dubois',
      firstname: 'Theo',
      email: 'theo.dubois@hotmail.fr',
      password: 'hashedPassword',
      phoneNumber: '+33123456789',
      role: 'USER' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    massage: {
      id: 'massage-pierre-chaude',
      name: 'massage pierre chaude',
      description: `massage avec des pierres tout droit sortie d'un volcan en eruption`,
      image: null,
      price: 110,
      duration: 90,
      position: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const connectedClient = {
    id: 'user-theo-789',
    email: 'theo.dubois@hotmail.fr',
    role: 'USER',
  };

  beforeEach(async () => {
    const mockPlanningService = {
      creerNouveauCreneau: jest.fn(),
      obtenirTousLesCreneaux: jest.fn(),
      reserverMassage: jest.fn(),
      voirMesRendezVous: jest.fn(),
      voirTousLesRendezVous: jest.fn(),
      modifierReservation: jest.fn(),
      annulerReservation: jest.fn(),
      supprimerReservation: jest.fn(),
      modifierCreneau: jest.fn(),
      desactiverCreneau: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanningController],
      providers: [
        {
          provide: PlanningService,
          useValue: mockPlanningService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<PlanningController>(PlanningController);
    service = module.get(PlanningService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('ajouterCreneau', () => {
    const newTimeSlot: CreateTimeSlotDto = {
      startTime: '2025-08-25T10:00:00.000Z',
      endTime: '2025-08-25T11:30:00.000Z',
      isActive: true,
    };

    // Teste l'ajout d'un nouveau créneau au planning
    it('allows adding a time slot to the schedule', async () => {
      service.creerNouveauCreneau.mockResolvedValue(afternoonSlot);

      const result = await controller.ajouterCreneau(newTimeSlot);

      expect(service.creerNouveauCreneau).toHaveBeenCalledWith(newTimeSlot);
      expect(result).toEqual(afternoonSlot);
    });
  });

  describe('voirTousLesCreneaux', () => {
    // Affiche la liste de tous les créneaux disponibles
    it('lists all available time slots', async () => {
      const completeSchedule = [afternoonSlot];
      service.obtenirTousLesCreneaux.mockResolvedValue(completeSchedule);

      const result = await controller.voirTousLesCreneaux();

      expect(service.obtenirTousLesCreneaux).toHaveBeenCalled();
      expect(result).toEqual(completeSchedule);
    });
  });

  describe('prendrRendezVous', () => {
    const bookingRequest: CreateBookingDto = {
      massageId: 'massage-pierre-chaude',
      timeSlotId: 'slot-140823-452',
      startTime: '2025-08-23T14:45:00.000Z',
      notes: 'pas trop chaude non plus',
    };

    // Permet de réserver un massage pour un client
    it('allows booking a massage appointment', async () => {
      const req = { user: connectedClient };
      service.reserverMassage.mockResolvedValue(theoBooking);

      const result = await controller.prendreRendezVous(bookingRequest, req);

      expect(service.reserverMassage).toHaveBeenCalledWith(
        'user-theo-789',
        bookingRequest,
      );
      expect(result).toEqual(theoBooking);
    });
  });

  describe('voirMesRendezVous', () => {
    // Affiche les rendez-vous du client connecté
    it('shows appointments for the connected client', async () => {
      const req = { user: connectedClient };
      const myAppointments = [theoBooking];
      service.voirMesRendezVous.mockResolvedValue(myAppointments);

      const result = await controller.voirMesRendezVous(req);

      expect(service.voirMesRendezVous).toHaveBeenCalledWith('user-theo-789');
      expect(result).toEqual(myAppointments);
    });
  });

  describe('voirToutesLesReservations', () => {
    // Permet aux admins de voir toutes les réservations
    it('allows admins to see all reservations', async () => {
      const allReservations = [theoBooking];
      service.voirTousLesRendezVous.mockResolvedValue(allReservations);

      const result = await controller.voirToutesLesReservations();

      expect(service.voirTousLesRendezVous).toHaveBeenCalled();
      expect(result).toEqual(allReservations);
    });
  });

  describe('modifierRendezVous', () => {
    const bookingUpdate: UpdateBookingDto = {
      notes: `J'aimerais un autre massage`,
    };

    // Permet de modifier les commentaires d'un rendez-vous
    it('allows modifying appointment comments', async () => {
      const updatedBooking = {
        ...theoBooking,
        notes: bookingUpdate.notes || theoBooking.notes,
      };
      service.modifierReservation.mockResolvedValue(updatedBooking);

      const result = await controller.modifierRendezVous(
        'booking-theo-456',
        bookingUpdate,
      );

      expect(service.modifierReservation).toHaveBeenCalledWith(
        'booking-theo-456',
        bookingUpdate,
      );
      expect(result).toEqual(updatedBooking);
    });
  });

  describe('annulerRendezVous', () => {
    // Traite l'annulation d'un rendez-vous
    it('processes appointment cancellation', async () => {
      const cancelledBooking = { ...theoBooking, status: 'CANCELLED' as const };
      service.annulerReservation.mockResolvedValue(cancelledBooking);

      const result = await controller.annulerRendezVous('booking-theo-456');

      expect(service.annulerReservation).toHaveBeenCalledWith(
        'booking-theo-456',
      );
      expect(result).toEqual(cancelledBooking);
    });
  });

  describe('supprimerReservation', () => {
    // Permet aux admins de supprimer une réservation
    it('allows admins to delete an appointment', async () => {
      service.supprimerReservation.mockResolvedValue(theoBooking);

      const result = await controller.supprimerReservation('booking-theo-456');

      expect(service.supprimerReservation).toHaveBeenCalledWith(
        'booking-theo-456',
      );
      expect(result).toEqual(theoBooking);
    });
  });

  describe('modifierCreneau', () => {
    const slotUpdate: UpdateTimeSlotDto = {
      startTime: '2025-08-23T15:00:00.000Z',
      endTime: '2025-08-23T16:30:00.000Z',
    };

    // Permet aux admins de modifier les horaires d'un créneau
    it('allows admins to modify a time slot', async () => {
      const updatedSlot = { ...afternoonSlot, bookings: [] };
      service.modifierCreneau.mockResolvedValue(updatedSlot);

      const result = await controller.modifierCreneau(
        'slot-140823-452',
        slotUpdate,
      );

      expect(service.modifierCreneau).toHaveBeenCalledWith(
        'slot-140823-452',
        slotUpdate,
      );
      expect(result).toEqual(updatedSlot);
    });
  });

  describe('supprimerCreneau', () => {
    // Désactive un créneau qui n'est plus nécessaire
    it('deactivates a time slot that is no longer needed', async () => {
      const deactivatedSlot = { ...afternoonSlot, isActive: false };
      service.desactiverCreneau.mockResolvedValue(deactivatedSlot);

      const result = await controller.supprimerCreneau('slot-140823-452');

      expect(service.desactiverCreneau).toHaveBeenCalledWith('slot-140823-452');
      expect(result).toEqual(deactivatedSlot);
    });
  });
});
