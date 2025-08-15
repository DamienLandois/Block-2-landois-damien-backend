import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly auth: AuthService) {
    super({ usernameField: 'email' });
  }
  async validate(email: string, password: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.auth.validateUser(email, password);
  }
}
