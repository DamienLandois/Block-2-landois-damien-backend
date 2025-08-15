import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    firstname?: string | null;
    name?: string | null;
    [key: string]: any;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: AuthenticatedRequest) {
    // req.user vient de LocalStrategy.validate()
    const access_token = await this.auth.signAccessToken({
      id: req.user.id,
      email: req.user.email,
    });
    return { access_token, user: req.user };
  }
}
