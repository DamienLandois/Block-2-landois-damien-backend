import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../user/enums/user-role.enum';
import { AuthenticatedUser } from '../interfaces/auth.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const user: AuthenticatedUser = request.user;

    if (!user || !user.id) {
      return false;
    }

    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      });

      if (!dbUser) {
        return false;
      }

      return requiredRoles.includes(dbUser.role as UserRole);
    } catch {
      return false;
    }
  }
}
