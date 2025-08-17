import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../user/enums/user-role.enum';

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

      console.log(`Email de confirmation envoyé à ${infos.emailClient}`);
    } catch (erreur) {
      console.error(
        `Erreur lors de l'envoi de l'email à ${infos.emailClient}:`,
        erreur,
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
      console.log(
        `${emailsAdmins.length} administrateur(s) trouvé(s) pour les notifications`,
      );

      return emailsAdmins;
    } catch (erreur) {
      console.error(
        'Erreur lors de la récupération des emails admins:',
        erreur,
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
        console.warn(
          "Aucun administrateur trouvé pour l'envoi de notifications",
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

      console.log(
        `Notification envoyée à ${emailsAdmins.length} administrateur(s): ${emailsAdmins.join(', ')}`,
      );
    } catch (erreur) {
      console.error("Erreur lors de l'envoi aux admins:", erreur);
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

      console.log(`Email d'annulation envoyé à ${infos.emailClient}`);
    } catch (erreur) {
      console.error(
        `Erreur lors de l'envoi de l'email d'annulation à ${infos.emailClient}:`,
        erreur,
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
