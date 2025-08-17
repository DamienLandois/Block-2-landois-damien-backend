import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PlanningService } from './planning.service';
import {
  CreateTimeSlotDto,
  UpdateTimeSlotDto,
  CreateBookingDto,
  UpdateBookingDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminOnly, UserOrAdmin } from '../auth/decorators/roles.decorator';

interface UtilisateurConnecte {
  user: { id: string; email: string; role: string };
}

@Controller('planning')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}
  //Gestion des créneaux horaires (Admin)
  @Post('creneaux')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  ajouterCreneau(@Body() donneesTimeslot: CreateTimeSlotDto) {
    return this.planningService.creerNouveauCreneau(donneesTimeslot);
  }

  @Get('creneaux')
  voirTousLesCreneaux() {
    return this.planningService.obtenirTousLesCreneaux();
  }

  @Put('creneaux/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  modifierCreneau(
    @Param('id') idCreneau: string,
    @Body() modifications: UpdateTimeSlotDto,
  ) {
    return this.planningService.modifierCreneau(idCreneau, modifications);
  }

  @Delete('creneaux/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  supprimerCreneau(@Param('id') idCreneau: string) {
    return this.planningService.desactiverCreneau(idCreneau);
  }

  //Gestion des réservations

  @Post('reservations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UserOrAdmin()
  prendreRendezVous(
    @Body() donneesReservation: CreateBookingDto,
    @Req() req: UtilisateurConnecte,
  ) {
    const idUtilisateur = req.user.id;
    return this.planningService.reserverMassage(
      idUtilisateur,
      donneesReservation,
    );
  }

  @Get('mes-rendez-vous')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UserOrAdmin()
  voirMesRendezVous(@Req() req: UtilisateurConnecte) {
    const idUtilisateur = req.user.id;
    return this.planningService.voirMesRendezVous(idUtilisateur);
  }

  @Get('reservations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  voirToutesLesReservations() {
    return this.planningService.voirTousLesRendezVous();
  }

  @Put('reservations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UserOrAdmin()
  modifierRendezVous(
    @Param('id') idReservation: string,
    @Body() modifications: UpdateBookingDto,
  ) {
    return this.planningService.modifierReservation(
      idReservation,
      modifications,
    );
  }

  @Delete('reservations/:id/annuler')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UserOrAdmin()
  annulerRendezVous(@Param('id') idReservation: string) {
    return this.planningService.annulerReservation(idReservation);
  }

  @Delete('reservations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  supprimerReservation(@Param('id') idReservation: string) {
    return this.planningService.supprimerReservation(idReservation);
  }
}
