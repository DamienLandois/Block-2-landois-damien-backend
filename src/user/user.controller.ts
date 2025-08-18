import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Patch,
  Delete,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminOnly, UserOrAdmin } from '../auth/decorators/roles.decorator';
import { UserRole } from './enums/user-role.enum';

@ApiTags('Utilisateur')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Récupérer tous les utilisateurs' })
  @ApiResponse({
    status: 200,
    description: 'Liste des utilisateurs récupérée avec succès',
  })
  @ApiResponse({ status: 403, description: 'Accès refusé - Admin uniquement' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Get()
  // url: /users (exemple: http://localhost:3001/users)
  getUsers() {
    return this.userService.getUsers();
  }

  @ApiOperation({ summary: 'Récupérer un utilisateur par ID' })
  @ApiParam({ name: 'userId', description: "ID de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Utilisateur récupéré avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UserOrAdmin()
  @Get(':userId')
  // url: /users/:userId (exemple: http://localhost:3001/users/1)
  getUser(@Param('userId') userId: string) {
    return this.userService.getUser({ userId });
  }

  @ApiOperation({
    summary: 'Créer un nouvel utilisateur (inscription publique)',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @Post()
  // url: /users (exemple: http://localhost:3001/users)
  createUser(@Body() body: CreateUserDto) {
    // Force TOUJOURS le rôle USER pour l'inscription publique
    return this.userService.createUser(body, UserRole.USER);
  }

  @ApiOperation({ summary: 'Créer un administrateur (Admin uniquement)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'Administrateur créé avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Admin uniquement',
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Post('admin')
  // url: /users/admin (exemple: http://localhost:3001/users/admin)
  createAdmin(@Body() body: CreateUserDto) {
    // Force TOUJOURS le rôle ADMIN pour cette route
    return this.userService.createUser(body, UserRole.ADMIN);
  }

  @ApiOperation({ summary: 'Modifier un utilisateur' })
  @ApiParam({ name: 'userId', description: "ID de l'utilisateur à modifier" })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'Utilisateur modifié avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UserOrAdmin()
  @Patch(':userId')
  // url: /users/:userId (exemple: http://localhost:3001/users/1)
  updateUser(@Param('userId') userId: string, @Body() body: UpdateUserDto) {
    return this.userService.updateUser(userId, body);
  }

  @ApiOperation({ summary: 'Supprimer un utilisateur' })
  @ApiParam({ name: 'userId', description: "ID de l'utilisateur à supprimer" })
  @ApiResponse({ status: 204, description: 'Utilisateur supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UserOrAdmin()
  @Delete(':userId')
  // url: /users/:userId (exemple: http://localhost:3001/users/1)
  @HttpCode(204)
  async deleteUser(@Param('userId') userId: string): Promise<void> {
    await this.userService.deleteUser(userId);
  }

  @ApiOperation({
    summary: "Modifier le rôle d'un utilisateur (Admin uniquement)",
  })
  @ApiParam({ name: 'userId', description: "ID de l'utilisateur" })
  @ApiBody({
    description: "Nouveau rôle de l'utilisateur",
    schema: {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          enum: Object.values(UserRole),
          description: "Nouveau rôle de l'utilisateur",
        },
      },
      required: ['role'],
    },
  })
  @ApiResponse({ status: 200, description: 'Rôle modifié avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Admin uniquement',
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Patch(':userId/role')
  // url: /users/:userId/role (exemple: http://localhost:3001/users/1/role)
  async changeUserRole(
    @Param('userId') userId: string,
    @Body() body: { role: UserRole },
  ) {
    return this.userService.updateUserRole(userId, body.role);
  }
}
