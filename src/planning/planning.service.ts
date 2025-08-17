import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  CreateBookingDto,
  CreateTimeSlotDto,
  UpdateBookingDto,
  UpdateTimeSlotDto,
} from './dto';

@Injectable()
export class PlanningService {
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
            massage: { select: { title: true, duration: true } },
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
          where: { status: { not: 'CANCELLED' } },
          include: { massage: true },
        },
      },
    });

    if (!creneauChoisi || !creneauChoisi.isActive) {
      throw new NotFoundException("Ce créneau n'est pas disponible");
    }

    // On vérifie que le massage peut tenir dans le créneau
    const dureeCreneauEnMinutes =
      (creneauChoisi.endTime.getTime() - creneauChoisi.startTime.getTime()) /
      (1000 * 60);
    if (massage.duration > dureeCreneauEnMinutes) {
      throw new BadRequestException(
        `Ce massage dure ${massage.duration} minutes mais le créneau ne fait que ${dureeCreneauEnMinutes} minutes`,
      );
    }

    // On vérifie qu'il n'y a pas de conflit avec les autres réservations
    const reservationsActives = creneauChoisi.bookings;

    // On calcule le temps total déjà pris (massages + pauses de 30min)
    let tempsTotalPris = 0;
    for (const autreReservation of reservationsActives) {
      tempsTotalPris += autreReservation.massage.duration + 30; // 30 minutes de pause obligatoire
    }

    // On enlève les 30 dernières minutes (pas de pause après le dernier massage)
    if (reservationsActives.length > 0) {
      tempsTotalPris -= 30;
    }

    // On vérifie s'il reste assez de place pour notre nouveau massage
    const tempsRestant = dureeCreneauEnMinutes - tempsTotalPris;
    const tempsNecessaire =
      massage.duration + (reservationsActives.length > 0 ? 30 : 0); // +30min de pause si pas le premier

    if (tempsNecessaire > tempsRestant) {
      throw new ConflictException(
        'Pas assez de temps libre dans ce créneau (il faut 30 minutes de pause entre les massages)',
      );
    }

    // Si tout va bien, on peut créer la réservation
    const nouvelleReservation = await this.prisma.booking.create({
      data: {
        userId: idUtilisateur,
        massageId: idMassage,
        timeSlotId: idCreneau,
        notes: commentaires,
      },
      include: { user: true, massage: true, timeSlot: true },
    });

    // Envoi automatique des emails de confirmation
    try {
      const infosReservation = {
        prenomClient: nouvelleReservation.user.firstname || 'Client',
        nomClient: nouvelleReservation.user.name || '',
        emailClient: nouvelleReservation.user.email,
        telephoneClient: nouvelleReservation.user.phoneNumber || undefined,
        nomMassage: nouvelleReservation.massage.title,
        dureeMassage: nouvelleReservation.massage.duration,
        prixMassage: nouvelleReservation.massage.price,
        dateDebut: nouvelleReservation.timeSlot.startTime,
        dateFin: nouvelleReservation.timeSlot.endTime,
        commentaires: nouvelleReservation.notes || undefined,
      };

      // Email au client
      await this.emailService.sendConfirmationClient(infosReservation);

      // Notification aux admins
      await this.emailService.notifyAdmins(infosReservation);

      console.log(
        `Emails envoyés avec succès pour la réservation ${nouvelleReservation.id}`,
      );
    } catch (erreurEmail) {
      console.error("Erreur lors de l'envoi des emails:", erreurEmail);
      // On ne fait pas échouer la réservation si l'email ne part pas
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
        nomMassage: reservation.massage.title,
        dureeMassage: reservation.massage.duration,
        prixMassage: reservation.massage.price,
        dateDebut: reservation.timeSlot.startTime,
        dateFin: reservation.timeSlot.endTime,
        commentaires: reservation.notes || undefined,
      };

      await this.emailService.sendAnnulationClient(infosReservation);

      console.log(
        `Email d'annulation envoyé pour la réservation ${idReservation}`,
      );
    } catch (erreurEmail) {
      console.error(
        "Erreur lors de l'envoi de l'email d'annulation:",
        erreurEmail,
      );
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
            massage: { select: { title: true } },
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
