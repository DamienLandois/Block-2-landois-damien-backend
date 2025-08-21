import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../user/enums/user-role.enum';
import { AppLoggerService } from '../common/logger/logger.service';

interface InfosReservation {
  prenomClient: string;
  nomClient: string;
  emailClient: string;
  telephoneClient?: string;
  nomMassage: string;
  dureeMassage: number;
  prixMassage: number;
  dateDebut: Date;
  dateFin: Date;
  commentaires?: string;
}

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  // Envoyer un email de confirmation au client
  async sendConfirmationClient(infos: InfosReservation) {
    const sujetEmail = `Confirmation de votre rendez-vous - ${infos.nomMassage}`;

    try {
      await this.mailerService.sendMail({
        to: infos.emailClient,
        subject: sujetEmail,
        template: 'booking-confirmation',
        context: {
          clientName: `${infos.prenomClient} ${infos.nomClient}`,
          massageName: infos.nomMassage,
          bookingDate: this.formaterDateFrancaise(infos.dateDebut).split(
            ' à ',
          )[0],
          bookingTime: this.formaterDateFrancaise(infos.dateDebut).split(
            ' à ',
          )[1],
          massageDuration: infos.dureeMassage,
          massagePrice: infos.prixMassage,
        },
      });

      this.logger.log(
        'Email de confirmation envoye avec succes',
        'EmailService',
      );
    } catch (erreur) {
      this.logger.error(
        'Erreur lors de envoi email de confirmation',
        'EmailService',
      );
      throw erreur;
    }
  }

  // Récupérer tous les emails des administrateurs
  private async getEmailsAdmins(): Promise<string[]> {
    try {
      const administrateurs = await this.prisma.user.findMany({
        where: {
          role: UserRole.ADMIN,
        },
        select: {
          email: true,
        },
      });

      const emailsAdmins = administrateurs.map((admin) => admin.email);
      this.logger.log(
        `${emailsAdmins.length} administrateurs trouves pour notifications`,
        'EmailService',
      );

      return emailsAdmins;
    } catch {
      this.logger.error(
        'Erreur lors de recuperation des emails admins',
        'EmailService',
      );
      // En cas d'erreur, on retourne une liste vide pour éviter de bloquer l'application
      return [];
    }
  }

  // Envoyer une notification aux admins
  async notifyAdmins(infos: InfosReservation) {
    const sujetEmail = `Nouvelle réservation - ${infos.nomMassage}`;

    try {
      // Récupérer dynamiquement tous les emails des admins
      const emailsAdmins = await this.getEmailsAdmins();

      if (emailsAdmins.length === 0) {
        this.logger.warn(
          'Aucun administrateur trouve pour notifications',
          'EmailService',
        );
        return;
      }

      // Envoyer l'email à tous les admins en une seule fois
      await this.mailerService.sendMail({
        to: emailsAdmins,
        subject: sujetEmail,
        template: 'admin-notification',
        context: {
          clientName: `${infos.prenomClient} ${infos.nomClient}`,
          clientEmail: infos.emailClient,
          massageName: infos.nomMassage,
          bookingDate: this.formaterDateFrancaise(infos.dateDebut).split(
            ' à ',
          )[0],
          bookingTime: this.formaterDateFrancaise(infos.dateDebut).split(
            ' à ',
          )[1],
          massageDuration: infos.dureeMassage,
          massagePrice: infos.prixMassage,
        },
      });

      this.logger.log(
        `Notification envoyee a ${emailsAdmins.length} administrateurs`,
        'EmailService',
      );
    } catch (erreur) {
      this.logger.error('Erreur lors de envoi aux admins', 'EmailService');
      throw erreur;
    }
  }

  async sendAnnulationClient(infos: InfosReservation) {
    const sujetEmail = `Annulation de votre rendez-vous - ${infos.nomMassage}`;

    try {
      await this.mailerService.sendMail({
        to: infos.emailClient,
        subject: sujetEmail,
        template: 'booking-cancellation',
        context: {
          clientName: `${infos.prenomClient} ${infos.nomClient}`,
          massageName: infos.nomMassage,
          bookingDate: this.formaterDateFrancaise(infos.dateDebut).split(
            ' à ',
          )[0],
          bookingTime: this.formaterDateFrancaise(infos.dateDebut).split(
            ' à ',
          )[1],
          massageDuration: infos.dureeMassage,
          massagePrice: infos.prixMassage,
        },
      });

      this.logger.log("Email d'annulation envoye avec succes", 'EmailService');
    } catch (erreur) {
      this.logger.error(
        "Erreur lors de envoi email d'annulation",
        'EmailService',
      );
      throw erreur;
    }
  }

  private formaterDateFrancaise(date: Date): string {
    const dateFormatee = date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Europe/Paris',
    });

    const heureFormatee = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    });

    return `${dateFormatee} à ${heureFormatee}`;
  }
}
