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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
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

@ApiTags('Planning')
@Controller('planning')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}
  //Gestion des créneaux horaires (Admin)
  @Post('creneaux')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Créer un nouveau créneau horaire  (Admin)' })
  @ApiBody({ type: CreateTimeSlotDto })
  @ApiResponse({ status: 201, description: 'Créneau créé avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Admin uniquement',
  })
  @ApiBearerAuth()
  ajouterCreneau(@Body() donneesTimeslot: CreateTimeSlotDto) {
    return this.planningService.creerNouveauCreneau(donneesTimeslot);
  }

  @Get('creneaux')
  @ApiOperation({ summary: 'Obtenir tous les créneaux horaires' })
  @ApiResponse({
    status: 200,
    description: 'Liste des créneaux récupérée avec succès',
  })
  voirTousLesCreneaux() {
    return this.planningService.obtenirTousLesCreneaux();
  }

  @Put('creneaux/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Modifier un créneau horaire existant  (Admin)' })
  @ApiParam({ name: 'id', description: 'ID du créneau à modifier' })
  @ApiBody({ type: UpdateTimeSlotDto })
  @ApiResponse({ status: 200, description: 'Créneau modifié avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Admin uniquement',
  })
  @ApiResponse({ status: 404, description: 'Créneau non trouvé' })
  @ApiBearerAuth()
  modifierCreneau(
    @Param('id') idCreneau: string,
    @Body() modifications: UpdateTimeSlotDto,
  ) {
    return this.planningService.modifierCreneau(idCreneau, modifications);
  }

  @Delete('creneaux/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Supprimer un créneau horaire  (Admin)' })
  @ApiParam({ name: 'id', description: 'ID du créneau à supprimer' })
  @ApiResponse({ status: 200, description: 'Créneau supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Admin uniquement',
  })
  @ApiResponse({ status: 404, description: 'Créneau non trouvé' })
  @ApiBearerAuth()
  supprimerCreneau(@Param('id') idCreneau: string) {
    return this.planningService.desactiverCreneau(idCreneau);
  }

  //Gestion des réservations

  @Post('reservations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UserOrAdmin()
  @ApiOperation({ summary: 'Créer une nouvelle réservation de massage' })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({ status: 201, description: 'Réservation créée avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou créneau indisponible',
  })
  @ApiBearerAuth()
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
  @ApiOperation({ summary: 'Obtenir mes rendez-vous' })
  @ApiResponse({
    status: 200,
    description: "Liste des rendez-vous de l'utilisateur récupérée avec succès",
  })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiBearerAuth()
  voirMesRendezVous(@Req() req: UtilisateurConnecte) {
    const idUtilisateur = req.user.id;
    return this.planningService.voirMesRendezVous(idUtilisateur);
  }

  @Get('reservations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Obtenir toutes les réservations (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Liste de toutes les réservations récupérée avec succès',
  })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Admin uniquement',
  })
  @ApiBearerAuth()
  voirToutesLesReservations() {
    return this.planningService.voirTousLesRendezVous();
  }

  @Put('reservations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UserOrAdmin()
  @ApiOperation({ summary: 'Modifier une réservation existante' })
  @ApiParam({ name: 'id', description: 'ID de la réservation à modifier' })
  @ApiBody({ type: UpdateBookingDto })
  @ApiResponse({ status: 200, description: 'Réservation modifiée avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Réservation non trouvée' })
  @ApiBearerAuth()
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
  @ApiOperation({ summary: 'Annuler une réservation' })
  @ApiParam({ name: 'id', description: 'ID de la réservation à annuler' })
  @ApiResponse({ status: 200, description: 'Réservation annulée avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Réservation non trouvée' })
  @ApiBearerAuth()
  annulerRendezVous(@Param('id') idReservation: string) {
    return this.planningService.annulerReservation(idReservation);
  }

  @Delete('reservations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Supprimer définitivement une réservation (Admin)' })
  @ApiParam({ name: 'id', description: 'ID de la réservation à supprimer' })
  @ApiResponse({
    status: 200,
    description: 'Réservation supprimée avec succès',
  })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Admin uniquement',
  })
  @ApiResponse({ status: 404, description: 'Réservation non trouvée' })
  @ApiBearerAuth()
  supprimerReservation(@Param('id') idReservation: string) {
    return this.planningService.supprimerReservation(idReservation);
  }
}
