import { Controller, Post, UseGuards, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthenticatedUser } from './interfaces/auth.interface';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
  [key: string]: any;
}

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiBody({
    description: 'Identifiants de connexion',
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: "Adresse email de l'utilisateur",
          example: 'user@example.com',
        },
        password: {
          type: 'string',
          description: "Mot de passe de l'utilisateur",
          example: 'motdepasse123',
        },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Connexion réussie',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          description: "Token JWT d'accès",
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', description: "ID de l'utilisateur" },
            email: { type: 'string', description: "Email de l'utilisateur" },
            role: { type: 'string', description: "Rôle de l'utilisateur" },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  @Post('login')
  async login(@Req() req: AuthenticatedRequest) {
    // req.user vient de LocalStrategy.validate()
    const access_token = await this.auth.signAccessToken({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    });
    return { access_token, user: req.user };
  }
}
