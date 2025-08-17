import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../user/enums/user-role.enum';

describe('EmailService', () => {
  let service: EmailService;
  let mailerService: jest.Mocked<MailerService>;
  let prismaService: jest.Mocked<PrismaService>;

  // Données de test
  const carlaBooking = {
    prenomClient: 'Carla',
    nomClient: 'Brownie',
    emailClient: 'carla.brownie@hotmail.fr',
    telephoneClient: '06.78.43.21.56',
    nomMassage: 'Massage californien',
    dureeMassage: 75,
    prixMassage: 90,
    dateDebut: new Date('2025-08-23T15:30:00.000Z'),
    dateFin: new Date('2025-08-23T16:45:00.000Z'),
    commentaires: 'First appointment for back tension relief, thank you',
  };

  beforeEach(async () => {
    const mockMailerService = {
      sendMail: jest.fn(),
    };

    const mockPrismaService = {
      user: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    mailerService = module.get(MailerService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Teste l'envoi d'email de confirmation avec le bon template et les bonnes données
  describe('sendConfirmationClient', () => {
    it('should send confirmation email with correct template and data', async () => {
      mailerService.sendMail.mockResolvedValue({
        messageId: 'conf-carla-789',
      });

      await service.sendConfirmationClient(carlaBooking);

      // Vérifie que l'email a été envoyé avec les bons paramètres
      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: 'carla.brownie@hotmail.fr',
        subject: 'Confirmation de votre rendez-vous - Massage californien',
        template: 'booking-confirmation',
        context: {
          clientName: 'Carla Brownie',
          massageName: 'Massage californien',
          bookingDate: 'samedi 23 août 2025',
          bookingTime: '17:30',
          massageDuration: 75,
          massagePrice: 90,
        },
      });
    });

    // Teste la gestion des erreurs d'envoi d'email
    it('should handle email sending errors properly', async () => {
      const smtpError = new Error('SMTP server temporarily unavailable');
      mailerService.sendMail.mockRejectedValue(smtpError);

      // Vérifie que l'erreur est correctement levée et gérée
      await expect(
        service.sendConfirmationClient(carlaBooking),
      ).rejects.toThrow('SMTP server temporarily unavailable');
    });
  });

  // Teste l'envoi d'email d'annulation avec le template
  describe('sendAnnulationClient', () => {
    it('should send cancellation email with correct template', async () => {
      mailerService.sendMail.mockResolvedValue({
        messageId: 'annul-carla-456',
      });

      await service.sendAnnulationClient(carlaBooking);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: 'carla.brownie@hotmail.fr',
        subject: 'Annulation de votre rendez-vous - Massage californien',
        template: 'booking-cancellation',
        context: {
          clientName: 'Carla Brownie',
          massageName: 'Massage californien',
          bookingDate: 'samedi 23 août 2025',
          bookingTime: '17:30',
          massageDuration: 75,
          massagePrice: 90,
        },
      });
    });

    // Teste la gestion des erreurs d'envoi d'email d'annulation
    it('should handle cancellation email sending errors', async () => {
      // scénario d'erreur serveur indisponible
      const serverError = new Error('Email service temporarily unavailable');
      mailerService.sendMail.mockRejectedValue(serverError);

      // Vérifie que l'erreur est correctement gérée
      await expect(service.sendAnnulationClient(carlaBooking)).rejects.toThrow(
        'Email service temporarily unavailable',
      );
    });
  });

  // Teste la récupération des admins depuis la base et leur notification
  describe('notifierAdmins', () => {
    it('should fetch admins from database and notify them', async () => {
      const spaTeam = [
        { email: 'jesuisadmin@admin.fr' },
        { email: 'jesuisaussiadmin@admin.fr' },
      ];

      (prismaService.user.findMany as jest.Mock).mockResolvedValue(spaTeam);
      mailerService.sendMail.mockResolvedValue({
        messageId: 'fsfdfgf5564',
      });

      await service.notifyAdmins(carlaBooking);

      // Vérifie que la recherche des admins a été effectuée correctement
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: { role: UserRole.ADMIN },
        select: { email: true },
      });

      // Vérifie que l'email de notification a été envoyé à tous les admins en une fois
      expect(mailerService.sendMail).toHaveBeenCalledTimes(1);
      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: ['jesuisadmin@admin.fr', 'jesuisaussiadmin@admin.fr'],
        subject: 'Nouvelle réservation - Massage californien',
        template: 'admin-notification',
        context: {
          clientName: 'Carla Brownie',
          clientEmail: 'carla.brownie@hotmail.fr',
          massageName: 'Massage californien',
          bookingDate: 'samedi 23 août 2025',
          bookingTime: '17:30',
          massageDuration: 75,
          massagePrice: 90,
        },
      });
    });

    // Teste le cas où aucun admin n'est configuré
    it('should do nothing when no admins are configured', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

      await service.notifyAdmins(carlaBooking);

      expect(consoleWarn).toHaveBeenCalledWith(
        "Aucun administrateur trouvé pour l'envoi de notifications",
      );
      expect(mailerService.sendMail).not.toHaveBeenCalled();

      consoleWarn.mockRestore();
    });

    // Teste des erreurs de connexion à la base
    it('should handle database connection errors', async () => {
      const connectionError = new Error('Connexion à la base fermée');
      (prismaService.user.findMany as jest.Mock).mockRejectedValue(
        connectionError,
      );
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      await service.notifyAdmins(carlaBooking);

      expect(consoleError).toHaveBeenCalledWith(
        'Erreur lors de la récupération des emails admins:',
        connectionError,
      );
      expect(mailerService.sendMail).not.toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  // Teste le formatage des dates en locale française
  describe('formaterDateFrancaise', () => {
    it('should format dates in French locale correctly', async () => {
      const christmasBooking = new Date('2025-12-25T15:30:00.000Z');
      const christmasBookingData = {
        ...carlaBooking,
        dateDebut: christmasBooking,
      };

      mailerService.sendMail.mockResolvedValue({ messageId: 'noel-123' });

      await service.sendConfirmationClient(christmasBookingData);

      const emailContent = mailerService.sendMail.mock.calls[0][0];
      expect(emailContent.context?.bookingDate).toContain('décembre');
      expect(emailContent.context?.bookingTime).toMatch(/\d{2}:\d{2}/);
    });
  });
});
