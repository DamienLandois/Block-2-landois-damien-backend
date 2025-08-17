import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '../../user/enums/user-role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let prismaService: any;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
    prismaService = module.get(PrismaService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

      const context = createMockExecutionContext({});
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(prismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('should deny access when user is not provided', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.USER]);

      const context = createMockExecutionContext(null);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(prismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('should deny access when user has no id', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.USER]);

      const context = createMockExecutionContext({ email: 'test@test.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(prismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('should allow access when user has required role (USER)', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.USER]);

      const mockUser = { id: 'user1' };
      const mockDbUser = { role: UserRole.USER };

      prismaService.user.findUnique.mockResolvedValue(mockDbUser as any);

      const context = createMockExecutionContext(mockUser);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
        select: { role: true },
      });
    });

    it('should allow access when user has required role (ADMIN)', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN]);

      const mockUser = { id: 'admin1' };
      const mockDbUser = { role: UserRole.ADMIN };

      prismaService.user.findUnique.mockResolvedValue(mockDbUser as any);

      const context = createMockExecutionContext(mockUser);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'admin1' },
        select: { role: true },
      });
    });

    it('should deny access when user does not have required role', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN]);

      const mockUser = { id: 'user1' };
      const mockDbUser = { role: UserRole.USER }; // User a le rôle USER mais ADMIN requis

      prismaService.user.findUnique.mockResolvedValue(mockDbUser as any);

      const context = createMockExecutionContext(mockUser);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should allow access when user has one of multiple required roles', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.USER, UserRole.ADMIN]);

      const mockUser = { id: 'user1' };
      const mockDbUser = { role: UserRole.USER }; // USER est dans la liste des rôles autorisés

      prismaService.user.findUnique.mockResolvedValue(mockDbUser as any);

      const context = createMockExecutionContext(mockUser);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user is not found in database', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.USER]);

      const mockUser = { id: 'nonexistent' };

      prismaService.user.findUnique.mockResolvedValue(null); // Utilisateur supprimé

      const context = createMockExecutionContext(mockUser);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should deny access when database query fails', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.USER]);

      const mockUser = { id: 'user1' };

      prismaService.user.findUnique.mockRejectedValue(new Error('DB Error'));

      const context = createMockExecutionContext(mockUser);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should verify real database role not JWT payload role', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN]);

      const mockUser = {
        id: 'user1',
        role: UserRole.ADMIN,
      };

      const mockDbUser = { role: UserRole.USER };

      prismaService.user.findUnique.mockResolvedValue(mockDbUser as any);

      const context = createMockExecutionContext(mockUser);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
        select: { role: true },
      });
    });
  });
});
