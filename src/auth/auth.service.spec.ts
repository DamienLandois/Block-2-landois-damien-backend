import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../user/enums/user-role.enum';

// On mock bcryptjs pour contrôler les comparaisons de mots de passe
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));
import { compare } from 'bcryptjs';

// Faux services pour les tests
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
};

const mockJwtService = {
  signAsync: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: typeof mockPrismaService;
  let jwtService: typeof mockJwtService;
  let mockCompare: jest.MockedFunction<any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);

    mockCompare = compare as jest.MockedFunction<typeof compare>;
  });

  // Nettoyer les mocks entre chaque test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Tests pour valider un utilisateur lors de la connexion
  describe('validateUser', () => {
    // Mock la DB et bcrypt pour succès, appelle validateUser(), vérifie qu'on reçoit les données sans password
    it('should return user data when credentials are valid', async () => {
      const email = 'damien.landois@test.com';
      const password = 'MotDePasse2024!';
      const userFromDb = {
        id: 'a1b2c3',
        email: 'damien.landois@test.com',
        firstname: 'Damien',
        name: 'Landois',
        password: 'hashed_password',
        role: UserRole.USER,
      };

      // Configuration des mocks pour un cas de succès

      prisma.user.findUnique.mockResolvedValue(userFromDb);
      mockCompare.mockResolvedValue(true); // Le mot de passe correspond

      const result = await service.validateUser(email, password);

      // Le mot de passe ne doit pas être dans le résultat final
      expect(result).toEqual({
        id: 'a1b2c3',
        email: 'damien.landois@test.com',
        firstname: 'Damien',
        name: 'Landois',
        role: UserRole.USER,
      });

      // Vérifier que l'email est bien converti en minuscules
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'damien.landois@test.com' },
        select: {
          id: true,
          email: true,
          firstname: true,
          name: true,
          password: true,
          role: true,
        },
      });

      expect(mockCompare).toHaveBeenCalledWith(password, 'hashed_password');
    });

    // Mock la DB et bcrypt, appelle validateUser() avec email mal formaté, vérifie le nettoyage email
    it('should handle email with spaces and uppercase', async () => {
      const email = '  Damien.LANDOIS@Gmail.COM  ';
      const password = 'MotDePasse2024!';
      const userFromDb = {
        id: 'a1b2c3',
        email: 'damien.landois@gmail.com',
        firstname: 'Damien',
        name: 'Landois',
        password: 'hashed_password',
        role: UserRole.ADMIN,
      };

      prisma.user.findUnique.mockResolvedValue(userFromDb);
      mockCompare.mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      // L'email doit être nettoyé (trim + lowercase)

      const expectedResult = {
        id: 'a1b2c3',
        email: 'damien.landois@gmail.com',
        firstname: 'Damien',
        name: 'Landois',
        role: UserRole.ADMIN,
      };
      expect(result).toEqual(expectedResult);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'damien.landois@gmail.com' },
        select: expect.any(Object),
      });
      expect(result.email).toBe('damien.landois@gmail.com');
    });

    // Mock la DB pour retourner null, appelle validateUser(), vérifie qu'on reçoit UnauthorizedException
    it('should throw UnauthorizedException when user not found', async () => {
      const email = 'utilisateur.inexistant@test.com';
      const password = 'MotDePasseValide123!';

      // Utilisateur inexistant
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser(email, password)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );

      // bcrypt ne doit même pas être appelé
      expect(mockCompare).not.toHaveBeenCalled();
    });

    // Mock la DB pour retourner utilisateur sans password, appelle validateUser(), vérifie UnauthorizedException
    it('should throw UnauthorizedException when user has no password', async () => {
      const email = 'marie.george@test.com';
      const password = 'MotDePasseQuelconque123!';
      const userWithoutPassword = {
        id: 'a1b2c3',
        email: 'marie.george@test.com',
        firstname: 'Marie',
        name: 'George',
        password: null,
        role: UserRole.USER,
      };

      prisma.user.findUnique.mockResolvedValue(userWithoutPassword);

      await expect(service.validateUser(email, password)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );

      expect(mockCompare).not.toHaveBeenCalled();
    });

    // Mock la DB et bcrypt pour échec, appelle validateUser() avec mauvais password, vérifie UnauthorizedException
    it('should throw UnauthorizedException when password is incorrect', async () => {
      const email = 'damien.landois@test.com';
      const password = 'MauvaisMotDePasse123!';
      const userFromDb = {
        id: 'a1b2c3',
        email: 'damien.landois@test.com',
        firstname: 'Damien',
        name: 'Landois',
        password: 'hashed_password',
        role: UserRole.USER,
      };

      prisma.user.findUnique.mockResolvedValue(userFromDb);
      mockCompare.mockResolvedValue(false); // Mauvais mot de passe

      await expect(service.validateUser(email, password)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );

      expect(mockCompare).toHaveBeenCalledWith(
        'MauvaisMotDePasse123!',
        'hashed_password',
      );
    });
  });

  // Tests pour générer un token JWT
  describe('signAccessToken', () => {
    // Mock le JwtService, appelle signAccessToken(), vérifie qu'on reçoit le token avec bon payload
    it('should generate a JWT token with correct payload including role', async () => {
      const user = {
        id: 'a1b2c3',
        email: 'damien.landois@test.com',
        role: UserRole.USER,
      };
      const expectedToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsImVtYWlsIjoiZGFtaWVuLmxhbmRvaXNAdGVzdC5jb20iLCJyb2xlIjoiVVNFUiJ9.token';

      jwtService.signAsync.mockResolvedValue(expectedToken);

      const result = await service.signAccessToken(user);

      expect(result).toBe(expectedToken);
      // Vérifier que le payload contient les bonnes informations avec le rôle
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'a1b2c3',
        email: 'damien.landois@test.com',
        role: UserRole.USER,
      });
    });

    // Mock le JwtService, appelle signAccessToken() avec admin, vérifie la génération de token
    it('should handle admin user data with correct role', async () => {
      const user = {
        id: 'q1s2d3',
        email: 'marie.george@test.com',
        role: UserRole.ADMIN,
      };
      const expectedToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MiIsImVtYWlsIjoibWFyaWUuZ2VvcmdlQHRlc3QuY29tIiwicm9sZSI6IkFETUlOIn0.token';

      jwtService.signAsync.mockResolvedValue(expectedToken);

      const result = await service.signAccessToken(user);

      expect(result).toBe(expectedToken);
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'q1s2d3',
        email: 'marie.george@test.com',
        role: UserRole.ADMIN,
      });
    });
  });
});
