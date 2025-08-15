import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Faux AuthService pour les tests
const mockAuthService = {
  signAccessToken: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: typeof mockAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  // Nettoyer les mocks entre chaque test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Tests pour la connexion utilisateur
  describe('login', () => {
    // Mock le service, appelle controller.login() avec req.user valide, vérifie qu'on reçoit token + user
    it('should return access token and user data on successful login', async () => {
      // Simulation d'une requête après passage par LocalAuthGuard
      // Le guard a déjà validé les identifiants et mis l'utilisateur dans req.user
      const mockRequest = {
        user: {
          id: 'u1',
          email: 'damien.landois@test.com',
          firstname: 'Damien',
          name: 'Landois',
        },
      };
      const mockAccessToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsImVtYWlsIjoiZGFtaWVuLmxhbmRvaXNAdGVzdC5jb20ifQ.token';

      // Le service génère un token pour cet utilisateur
      authService.signAccessToken.mockResolvedValue(mockAccessToken);

      const result = await controller.login(mockRequest);

      // On doit recevoir le token ET les infos utilisateur
      expect(result).toEqual({
        access_token: mockAccessToken,
        user: mockRequest.user,
      });

      // Vérifier que le service a été appelé avec les bonnes données
      expect(authService.signAccessToken).toHaveBeenCalledTimes(1);
      expect(authService.signAccessToken).toHaveBeenCalledWith({
        id: 'u1',
        email: 'damien.landois@test.com',
      });
    });

    // Mock le service, appelle controller.login() avec utilisateur minimal, vérifie token + user
    it('should work with minimal user data', async () => {
      // Test avec un utilisateur ayant que les champs essentiels
      const mockRequest = {
        user: {
          id: 'z1e2r3',
          email: 'marie.george@test.com',
          firstname: null,
          name: null,
        },
      };
      const mockAccessToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MiIsImVtYWlsIjoibWFyaWUuZHVwb250QHRlc3QuY29tIn0.token';

      authService.signAccessToken.mockResolvedValue(mockAccessToken);

      const result = await controller.login(mockRequest);

      expect(result).toEqual({
        access_token: mockAccessToken,
        user: mockRequest.user,
      });

      // Même avec des champs null, l'ID et email suffisent pour le token
      expect(authService.signAccessToken).toHaveBeenCalledWith({
        id: 'z1e2r3',
        email: 'marie.george@test.com',
      });
    });

    // Mock le service, appelle controller.login() avec UUID différent, vérifie token
    it('should handle different user ID formats', async () => {
      // Test avec un UUID différent
      const mockRequest = {
        user: {
          id: 'abc123def456',
          email: 'antoine.failla@test.com',
          firstname: 'Antoine',
          name: 'Failla',
        },
      };
      const mockAccessToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYmMtMTIzLWRlZi00NTYiLCJlbWFpbCI6ImFudG9pbmUuZmFpbGxhQHRlc3QuY29tIn0.token';

      authService.signAccessToken.mockResolvedValue(mockAccessToken);

      const result = await controller.login(mockRequest);

      expect(result.access_token).toBe(mockAccessToken);
      expect(result.user).toBe(mockRequest.user);
      expect(authService.signAccessToken).toHaveBeenCalledWith({
        id: 'abc123def456',
        email: 'antoine.failla@test.com',
      });
    });

    // Mock le service avec erreur, appelle controller.login(), vérifie erreur propagée
    it('should propagate service errors', async () => {
      // Si le service JWT plante, l'erreur doit remonter
      const mockRequest = {
        user: {
          id: 'u1',
          email: 'damien.landois@test.com',
        },
      };

      authService.signAccessToken.mockRejectedValue(
        new Error('JWT signing failed'),
      );

      await expect(controller.login(mockRequest)).rejects.toThrow(
        'JWT signing failed',
      );
      expect(authService.signAccessToken).toHaveBeenCalledWith({
        id: 'u1',
        email: 'damien.landois@test.com',
      });
    });

    // Mock le service, appelle controller.login() avec user complet, vérifie extraction id+email
    it('should extract only id and email for token generation', async () => {
      // Même si req.user contient plein d'infos, seuls id et email vont dans le token
      const mockRequest = {
        user: {
          id: 'u1',
          email: 'sophie.bolle@test.com',
          firstname: 'Sophie',
          name: 'Bolle',
          phoneNumber: '0123456789',
          createdAt: '2025-01-01',
          updatedAt: '2025-12-01',
          // ... autres champs possibles
        },
      };
      const mockAccessToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsImVtYWlsIjoic29waGllLm1hcnRpbkB0ZXN0LmNvbSJ9.clean';

      authService.signAccessToken.mockResolvedValue(mockAccessToken);

      await controller.login(mockRequest);

      // Seuls id et email sont passés au service, pas les autres champs
      expect(authService.signAccessToken).toHaveBeenCalledWith({
        id: 'u1',
        email: 'sophie.bolle@test.com',
      });
    });
  });
});
