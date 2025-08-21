import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AppLoggerService } from '../common/logger/logger.service';
import {
  CreateBookingDto,
  CreateTimeSlotDto,
  UpdateBookingDto,
  UpdateTimeSlotDto,
} from './dto';

@Injectable()
export class PlanningService {
  private readonly logger = new AppLoggerService();

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // Créer un nouveau créneau horaire (admin seulement)
  async creerNouveauCreneau(donneesTimeslot: CreateTimeSlotDto) {
    const { startTime: heureDebut, endTime: heureFin } = donneesTimeslot;

    // On vérifie que l'heure de fin est bien après l'heure de début
    if (new Date(heureFin) <= new Date(heureDebut)) {
      throw new BadRequestException(
        "L'heure de fin doit être après l'heure de début",
      );
    }

    // On regarde s'il y a déjà un créneau qui se chevauche
    const creneauExistant = await this.prisma.timeSlot.findFirst({
      where: {
        isActive: true,
        OR: [
          {
            startTime: { lte: new Date(heureDebut) },
            endTime: { gt: new Date(heureDebut) },
          },
          {
            startTime: { lt: new Date(heureFin) },
            endTime: { gte: new Date(heureFin) },
          },
          {
            startTime: { gte: new Date(heureDebut) },
            endTime: { lte: new Date(heureFin) },
          },
        ],
      },
    });

    if (creneauExistant) {
      throw new ConflictException('Un créneau existe déjà sur cette période');
    }

    return this.prisma.timeSlot.create({
      data: { startTime: new Date(heureDebut), endTime: new Date(heureFin) },
    });
  }

  // Récupérer tous les créneaux disponibles
  async obtenirTousLesCreneaux() {
    return this.prisma.timeSlot.findMany({
      where: { isActive: true },
      include: {
        bookings: {
          include: {
            user: { select: { firstname: true, name: true, email: true } },
            massage: { select: { name: true, duration: true } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  // Réserver un massage sur un créneau
  async reserverMassage(
    idUtilisateur: string,
    donneesReservation: CreateBookingDto,
  ) {
    const {
      massageId: idMassage,
      timeSlotId: idCreneau,
      startTime: heureDebutSouhaitee,
      notes: commentaires,
    } = donneesReservation;

    // On récupère les infos du massage pour connaître sa durée
    const massage = await this.prisma.massage.findUnique({
      where: { id: idMassage },
    });
    if (!massage) {
      throw new NotFoundException("Ce massage n'existe pas");
    }

    // On récupère le créneau choisi
    const creneauChoisi = await this.prisma.timeSlot.findUnique({
      where: { id: idCreneau },
      include: {
        bookings: {
          include: {
            massage: true,
          },
        },
      },
    });

    if (!creneauChoisi || !creneauChoisi.isActive) {
      throw new NotFoundException("Ce créneau n'est pas disponible");
    }

    // Conversion des heures en objets Date
    const heureDebut = new Date(heureDebutSouhaitee);
    const heureFin = new Date(heureDebut.getTime() + massage.duration * 60000);
    const heureDebutCreneau = creneauChoisi.startTime;
    const heureFinCreneau = creneauChoisi.endTime;

    // Vérification que le massage est dans les limites du créneau
    if (heureDebut < heureDebutCreneau) {
      throw new BadRequestException(
        `Le massage ne peut pas commencer avant ${heureDebutCreneau.toISOString()}`,
      );
    }

    if (heureFin > heureFinCreneau) {
      throw new BadRequestException(
        `Le massage se terminerait à ${heureFin.toISOString()} mais le créneau se termine à ${heureFinCreneau.toISOString()}`,
      );
    }

    // Vérification des conflits avec les autres réservations
    const reservationsActives = creneauChoisi.bookings;

    for (const autreReservation of reservationsActives) {
      // Utilisation des heures exactes de la réservation
      const autreDebut = autreReservation.startTime;
      const autreFin = autreReservation.endTime;

      if (!autreDebut || !autreFin) {
        throw new Error('Réservation sans heures définies trouvée');
      }

      // Vérification du chevauchement direct
      const chevauchementDirect =
        heureDebut < autreFin && heureFin > autreDebut;

      if (chevauchementDirect) {
        // Chevauchement complet = conflit
        throw new ConflictException(
          `Conflit d'horaire: ce créneau horaire est déjà occupé par un autre massage.`,
        );
      }

      // Vérification des pauses (seulement s'il n'y a pas de chevauchement)
      if (heureFin <= autreDebut) {
        // Notre massage se termine avant l'autre commence
        const pauseDisponible =
          (autreDebut.getTime() - heureFin.getTime()) / (1000 * 60);
        if (pauseDisponible < 30) {
          throw new ConflictException(
            `Pas assez de pause entre les massages. Il faut 30 minutes de pause minimum, vous n'avez que ${Math.round(pauseDisponible)} minutes.`,
          );
        }
      } else if (heureDebut >= autreFin) {
        // Notre massage commence après que l'autre se termine
        const pauseDisponible =
          (heureDebut.getTime() - autreFin.getTime()) / (1000 * 60);
        if (pauseDisponible < 30) {
          throw new ConflictException(
            `Pas assez de pause entre les massages. Il faut 30 minutes de pause minimum, vous n'avez que ${Math.round(pauseDisponible)} minutes.`,
          );
        }
      }
    }

    // Si tout va bien, on peut créer la réservation
    const nouvelleReservation = await this.prisma.booking.create({
      data: {
        userId: idUtilisateur,
        massageId: idMassage,
        timeSlotId: idCreneau,
        startTime: heureDebut,
        endTime: heureFin,
        notes: commentaires,
      },
    });

    // On récupère les infos complètes pour l'email
    const utilisateur = await this.prisma.user.findUnique({
      where: { id: idUtilisateur },
    });

    if (!utilisateur) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Envoi automatique des emails de confirmation
    try {
      const infosReservation = {
        prenomClient: utilisateur.firstname || 'Client',
        nomClient: utilisateur.name || '',
        emailClient: utilisateur.email,
        telephoneClient: utilisateur.phoneNumber || undefined,
        nomMassage: massage.name,
        dureeMassage: massage.duration,
        prixMassage: massage.price,
        dateDebut: heureDebut, // Heure précise du massage
        dateFin: heureFin, // Heure de fin précise du massage
        commentaires: nouvelleReservation.notes || undefined,
      };

      // Email au client
      await this.emailService.sendConfirmationClient(infosReservation);

      // Notification aux admins
      await this.emailService.notifyAdmins(infosReservation);
    } catch {
      this.logger.error(
        'Erreur lors de envoi des emails de confirmation',
        'PlanningService',
      );
      // On ne fait pas échouer la réservation si l'email ne part pas
    } finally {
      this.logger.log('Reservation créée avec succès', 'PlanningService');
    }

    return nouvelleReservation;
  }

  // Voir ses propres rendez-vous (pour les utilisateurs)
  async voirMesRendezVous(idUtilisateur: string) {
    return this.prisma.booking.findMany({
      where: { userId: idUtilisateur },
      include: { massage: true, timeSlot: true },
      orderBy: { timeSlot: { startTime: 'asc' } },
    });
  }

  // Voir tous les rendez-vous (pour les admins)
  async voirTousLesRendezVous() {
    return this.prisma.booking.findMany({
      include: {
        user: {
          select: {
            firstname: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        massage: true,
        timeSlot: true,
      },
      orderBy: { timeSlot: { startTime: 'asc' } },
    });
  }

  // Modifier une réservation
  async modifierReservation(
    idReservation: string,
    modifications: UpdateBookingDto,
  ) {
    const reservationExistante = await this.prisma.booking.findUnique({
      where: { id: idReservation },
      include: { timeSlot: true, massage: true },
    });

    if (!reservationExistante) {
      throw new NotFoundException("Cette réservation n'existe pas");
    }

    return this.prisma.booking.update({
      where: { id: idReservation },
      data: modifications,
      include: { user: true, massage: true, timeSlot: true },
    });
  }

  // Annuler une réservation
  async annulerReservation(idReservation: string) {
    const reservation = await this.prisma.booking.findUnique({
      where: { id: idReservation },
      include: { user: true, massage: true, timeSlot: true },
    });

    if (!reservation) {
      throw new NotFoundException("Cette réservation n'existe pas");
    }

    const reservationAnnulee = await this.prisma.booking.update({
      where: { id: idReservation },
      data: { status: 'CANCELLED' },
      include: { user: true, massage: true, timeSlot: true },
    });

    //Envoi automatique de l'email d'annulation
    try {
      const infosReservation = {
        prenomClient: reservation.user.firstname || 'Client',
        nomClient: reservation.user.name || '',
        emailClient: reservation.user.email,
        telephoneClient: reservation.user.phoneNumber || undefined,
        nomMassage: reservation.massage.name,
        dureeMassage: reservation.massage.duration,
        prixMassage: reservation.massage.price,
        dateDebut: reservation.timeSlot.startTime,
        dateFin: reservation.timeSlot.endTime,
        commentaires: reservation.notes || undefined,
      };

      await this.emailService.sendAnnulationClient(infosReservation);
    } catch (erreur) {
      const errorMessage =
        erreur instanceof Error ? erreur.message : String(erreur);
      this.logger.error(
        `Erreur lors de annulation de reservation: ${errorMessage}`,
        'PlanningService',
      );
      // Ne pas faire échouer l'annulation si l'email ne part pas
    } finally {
      this.logger.log('Reservation annulee avec succes', 'PlanningService');
    }

    return reservationAnnulee;
  }

  // Supprimer complètement une réservation (libère le créneau)
  async supprimerReservation(idReservation: string) {
    const reservation = await this.prisma.booking.findUnique({
      where: { id: idReservation },
    });

    if (!reservation) {
      throw new NotFoundException("Cette réservation n'existe pas");
    }

    return this.prisma.booking.delete({ where: { id: idReservation } });
  }

  // Modifier un créneau horaire
  async modifierCreneau(idCreneau: string, modifications: UpdateTimeSlotDto) {
    const creneauExistant = await this.prisma.timeSlot.findUnique({
      where: { id: idCreneau },
    });

    if (!creneauExistant) {
      throw new NotFoundException("Ce créneau n'existe pas");
    }

    return this.prisma.timeSlot.update({
      where: { id: idCreneau },
      data: modifications,
      include: {
        bookings: {
          include: {
            user: { select: { firstname: true, name: true } },
            massage: { select: { name: true } },
          },
        },
      },
    });
  }

  // Désactiver un créneau
  async desactiverCreneau(idCreneau: string) {
    return this.prisma.timeSlot.update({
      where: { id: idCreneau },
      data: { isActive: false },
    });
  }
}
