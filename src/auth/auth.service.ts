import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
    ) {}

    async validateUser(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
            select: { id: true, email: true, firstname: true, name: true, password: true },
        });
        if (!user?.password) throw new UnauthorizedException('Invalid credentials');

        const ok = await compare(password, user.password);
        if (!ok) throw new UnauthorizedException('Invalid credentials');

        const { password: _omit, ...safe } = user;
        return safe;
    }

    async signAccessToken(user: { id: string; email: string }) {
        const payload = { sub: user.id, email: user.email };
        return this.jwt.signAsync(payload);
    }
}

