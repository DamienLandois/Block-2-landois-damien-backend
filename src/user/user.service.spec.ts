import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';

// On mock le hash pour éviter un vrai coût CPU (et rendre le test déterministe)
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));
import { hash } from 'bcryptjs';

// Créer un mock pour PrismaService
const mockPrismaService = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UserService', () => {
  let service: UserService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get(PrismaService);
  });

  // Nettoyer tous les mocks avant chaque test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------- getUsers --------------------
  describe('getUsers', () => {
    // Mock la DB pour retourner des utilisateurs, appelle getUsers(), et vérifie qu'on reçoit ces utilisateurs
    it('returns an array of users', async () => {
      const mockUsers = [
        {
          id: 'a1b2c3',
          email: 'damien.landois@test.com',
          firstname: 'Damien',
          name: 'Landois',
          phoneNumber: '0625468547',
        },
      ];

      prisma.user.findMany.mockResolvedValue(mockUsers);

      const res = await service.getUsers();

      expect(res).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledTimes(1);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const expectedFirstUser = {
        id: 'a1b2c3',
        email: 'damien.landois@test.com',
        firstname: 'Damien',
        name: 'Landois',
        phoneNumber: '0625468547',
      };
      expect(res[0]).toEqual(expectedFirstUser);
    });
  });

  // -------------------- getUser --------------------
  describe('getUser', () => {
    // Mock la DB pour retourner un utilisateur, appelle getUser(id), et vérifie qu'on reçoit cet utilisateur
    it('returns a single user by id', async () => {
      const mockUser = { id: 'a1b2c3', email: 'damien.landois@test.com' };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const res = await service.getUser({ userId: 'a1b2c3' });

      expect(res).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'a1b2c3' },
        select: expect.any(Object),
      });
    });

    // Mock la DB pour retourner null, appelle getUser(id inexistant), et vérifie qu'on reçoit null
    it('returns null if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const res = await service.getUser({ userId: 'missing' });
      expect(res).toBeNull();
    });
  });

  // -------------------- createUser --------------------
  describe('createUser', () => {
    // Mock bcrypt et la DB, appelle createUser(), vérifie que le password est hashé et l'email en minuscule
    it('creates a user (hash password + lowercases email)', async () => {
      const input = {
        email: 'Damien.LANDOIS@Gmail.COM',
        password: 'MotDePasse2024!',
        firstname: 'Damien',
        name: 'Landois',
        phoneNumber: '0612345678',
      };
      const created = {
        id: 'a1b2c3',
        email: 'damien.landois@gmail.com',
        firstname: 'Damien',
        name: 'Landois',
        phoneNumber: '0612345678',
      };
      prisma.user.create.mockResolvedValue(created);

      const res = await service.createUser(input as any);

      // le hash a bien été appelé avec le bon salt
      expect(hash).toHaveBeenCalledWith('MotDePasse2024!', 11);
      // Prisma reçoit bien l'email en minuscule
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'damien.landois@gmail.com',
          password: 'hashed_password',
        }),
        select: expect.any(Object),
      });
      expect(res).toEqual(created);
    });

    // Mock la DB pour lever une erreur P2002 (email unique), appelle createUser(), vérifie qu'on reçoit ConflictException
    it('throws ConflictException when email already in use (P2002)', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.createUser({
          email: 'utilisateur.existant@test.com',
          password: 'MotDePasseValide123!',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    // Mock la DB pour lever une erreur inconnue, appelle createUser(), vérifie que l'erreur remonte telle quelle
    it('rethrows unknown errors', async () => {
      const err = new Error('random');
      prisma.user.create.mockRejectedValue(err);
      await expect(
        service.createUser({
          email: 'test.test@test.com',
          password: 'AutreMotDePasse2024!',
        } as any),
      ).rejects.toBe(err);
    });
  });

  // -------------------- updateUser --------------------
  describe('updateUser', () => {
    // Mock la DB, appelle updateUser() avec de nouvelles données, vérifie que l'email est converti en minuscule
    it('updates basic fields & lowercases email', async () => {
      const updated = {
        id: 'a1b2c3',
        email: 'damien.landois.nouveau@gmail.com',
        firstname: 'Damien',
        name: 'Landois-Nouveau',
        phoneNumber: '0687654321',
      };
      prisma.user.update.mockResolvedValue(updated);

      const res = await service.updateUser('a1b2c3', {
        email: 'Damien.Landois.NOUVEAU@Gmail.COM',
        firstname: 'Damien',
        name: 'Landois-Nouveau',
        phoneNumber: '0687654321',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'a1b2c3' },
        data: expect.objectContaining({
          email: 'damien.landois.nouveau@gmail.com',
          firstname: 'Damien',
          name: 'Landois-Nouveau',
          phoneNumber: '0687654321',
        }),
        select: expect.any(Object),
      });
      expect(res).toEqual(updated);
    });

    // Mock bcrypt et la DB, appelle updateUser() avec un nouveau password, vérifie que bcrypt.hash est appelé
    it('hashes password when provided', async () => {
      prisma.user.update.mockResolvedValue({
        id: 'a1b2c3',
        email: 'damien.landois@test.com',
      });

      await service.updateUser('a1b2c3', {
        password: 'NouveauMotDePasse2024!',
      });

      expect(hash).toHaveBeenCalledWith('NouveauMotDePasse2024!', 11);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'a1b2c3' },
        data: expect.objectContaining({ password: 'hashed_password' }),
        select: expect.any(Object),
      });
    });

    // Mock la DB pour lever erreur P2002 (duplicate), appelle updateUser() avec email existant, vérifie ConflictException
    it('throws ConflictException (P2002) when email duplicate', async () => {
      prisma.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.updateUser('a1b2c3', { email: 'email.deja.utilise@test.com' }),
      ).rejects.toThrow(ConflictException);
    });

    // Mock la DB pour lever erreur P2025 (not found), appelle updateUser() avec ID inexistant, vérifie NotFoundException
    it('throws NotFoundException (P2025) when user not found', async () => {
      prisma.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('notfound', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.updateUser('missing', { email: 'test.test@test.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    // Mock la DB pour lever une erreur inconnue, appelle updateUser(), vérifie que l'erreur remonte telle quelle
    it('rethrows unknown errors', async () => {
      const err = new Error('random');
      prisma.user.update.mockRejectedValue(err);

      await expect(
        service.updateUser('a1b2c3', { name: 'TestNom' }),
      ).rejects.toBe(err);
    });
  });

  // -------------------- deleteUser --------------------
  describe('deleteUser', () => {
    // Mock la DB pour réussir, appelle deleteUser(), vérifie que ça retourne undefined (void)
    it('deletes user (void)', async () => {
      prisma.user.delete.mockResolvedValue({});

      await expect(service.deleteUser('a1b2c3')).resolves.toBeUndefined();
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'a1b2c3' },
      });
    });

    // Mock la DB pour lever erreur P2025 (not found), appelle deleteUser() avec ID inexistant, vérifie NotFoundException
    it('throws NotFoundException (P2025) if missing', async () => {
      prisma.user.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('notfound', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(service.deleteUser('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    // Mock la DB pour lever une erreur inconnue, appelle deleteUser(), vérifie que l'erreur remonte telle quelle
    it('rethrows unknown errors', async () => {
      const err = new Error('random');
      prisma.user.delete.mockRejectedValue(err);

      await expect(service.deleteUser('a1b2c3')).rejects.toBe(err);
    });
  });
});
