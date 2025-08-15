import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// On crée un faux UserService pour les tests
const mockUserService = {
  getUsers: jest.fn(),
  getUser: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
};

describe('UserController', () => {
  let controller: UserController;
  let userService: typeof mockUserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService, // On remplace le vrai service par notre faux
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
  });

  // Reset des mocks entre chaque test pour éviter les interférences
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Tests pour récupérer tous les utilisateurs
  describe('getUsers', () => {
    // Mock le service pour retourner des utilisateurs, appelle controller.getUsers(), vérifie qu'on reçoit ces utilisateurs
    it('should return an array of users', async () => {
      const mockUsers = [
        {
          id: 'a1b2c3',
          email: 'damien.landois@test.com',
          firstname: 'Damien',
          name: 'Landois',
        },
        {
          id: 'u2',
          email: 'marie.george@test.com',
          firstname: 'Marie',
          name: 'George',
        },
      ];
      // On dit au mock service de retourner ces utilisateurs
      userService.getUsers.mockResolvedValue(mockUsers);

      const result = await controller.getUsers();

      expect(result).toEqual(mockUsers);
      expect(userService.getUsers).toHaveBeenCalledTimes(1);
      expect(userService.getUsers).toHaveBeenCalledWith();
    });

    // Mock le service pour retourner liste vide, appelle controller.getUsers(), vérifie qu'on reçoit un tableau vide
    it('should handle empty user list', async () => {
      // Cas où il n'y a pas d'utilisateurs
      userService.getUsers.mockResolvedValue([]);

      const result = await controller.getUsers();

      expect(result).toEqual([]);
      expect(userService.getUsers).toHaveBeenCalledTimes(1);
    });
  });

  // Tests pour récupérer un utilisateur spécifique
  describe('getUser', () => {
    // Mock le service pour retourner un utilisateur, appelle controller.getUser(id), vérifie qu'on reçoit cet utilisateur
    it('should return a single user by id', async () => {
      const mockUser = {
        id: 'a1b2c3',
        email: 'damien.landois@test.com',
        firstname: 'Damien',
        name: 'Landois',
      };
      const userId = 'a1b2c3';
      userService.getUser.mockResolvedValue(mockUser);

      const result = await controller.getUser(userId);

      expect(result).toEqual(mockUser);
      expect(userService.getUser).toHaveBeenCalledTimes(1);
      // Vérifier que l'ID est bien passé dans le bon format
      expect(userService.getUser).toHaveBeenCalledWith({ userId });
    });

    // Mock le service pour retourner null, appelle controller.getUser(id inexistant), vérifie qu'on reçoit null
    it('should return null if user not found', async () => {
      const userId = 'nonexistent';
      userService.getUser.mockResolvedValue(null);

      const result = await controller.getUser(userId);

      expect(result).toBeNull();
      expect(userService.getUser).toHaveBeenCalledWith({ userId });
    });
  });

  // Tests pour créer un nouvel utilisateur
  describe('createUser', () => {
    // Mock le service, appelle controller.createUser() avec données complètes, vérifie qu'on reçoit l'utilisateur créé
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'damien.landois@gmail.com',
        password: 'MotDePasse2024!',
        firstname: 'Damien',
        name: 'Landois',
        phoneNumber: '0612345678',
      };
      const createdUser = {
        id: 'u3',
        email: 'damien.landois@gmail.com',
        firstname: 'Damien',
        name: 'Landois',
        phoneNumber: '0612345678',
      };
      userService.createUser.mockResolvedValue(createdUser);

      const result = await controller.createUser(createUserDto);

      expect(result).toEqual(createdUser);
      expect(userService.createUser).toHaveBeenCalledTimes(1);
      expect(userService.createUser).toHaveBeenCalledWith(createUserDto);
    });

    // Mock le service, appelle controller.createUser() avec seulement les champs requis, vérifie qu'on reçoit l'utilisateur
    it('should create user with minimal required fields', async () => {
      // Test avec seulement email et password (champs obligatoires)
      const createUserDto: CreateUserDto = {
        email: 'marie.george@test.com',
        password: 'AutreMotDePasse2024!',
      };
      const createdUser = {
        id: 'u4',
        email: 'marie.george@test.com',
        firstname: null,
        name: null,
        phoneNumber: null,
      };
      userService.createUser.mockResolvedValue(createdUser);

      const result = await controller.createUser(createUserDto);

      expect(result).toEqual(createdUser);
      expect(userService.createUser).toHaveBeenCalledWith(createUserDto);
    });
  });

  // Tests pour modifier un utilisateur existant
  describe('updateUser', () => {
    // Mock le service, appelle controller.updateUser() avec nouvelles données, vérifie qu'on reçoit l'utilisateur modifié
    it('should update user with all fields', async () => {
      const userId = 'a1b2c3';
      const updateUserDto: UpdateUserDto = {
        email: 'damien.landois.nouveau@gmail.com',
        firstname: 'Damien',
        name: 'Landois-Modifié',
        phoneNumber: '0687654321',
      };
      const updatedUser = {
        id: userId,
        email: 'damien.landois.nouveau@gmail.com',
        firstname: 'Damien',
        name: 'Landois-Modifié',
        phoneNumber: '0687654321',
      };
      userService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateUser(userId, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(userService.updateUser).toHaveBeenCalledTimes(1);
      expect(userService.updateUser).toHaveBeenCalledWith(
        userId,
        updateUserDto,
      );
    });

    // Mock le service, appelle controller.updateUser() avec un seul champ, vérifie qu'on reçoit l'utilisateur modifié
    it('should update user with partial fields', async () => {
      // On peut modifier juste un champ, pas besoin de tout remplir
      const userId = 'a1b2c3';
      const updateUserDto: UpdateUserDto = {
        firstname: 'TestPrenom',
      };
      const updatedUser = {
        id: userId,
        email: 'damien.landois@test.com',
        firstname: 'TestPrenom',
        name: 'Landois',
        phoneNumber: '0612345678',
      };
      userService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateUser(userId, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(userService.updateUser).toHaveBeenCalledWith(
        userId,
        updateUserDto,
      );
    });

    // Mock le service, appelle controller.updateUser() avec nouveau password, vérifie qu'on reçoit l'utilisateur modifié
    it('should update user password', async () => {
      const userId = 'a1b2c3';
      const updateUserDto: UpdateUserDto = {
        password: 'NouveauMotDePasse2024!',
      };
      const updatedUser = {
        id: userId,
        email: 'damien.landois@test.com',
        firstname: 'Damien',
        name: 'Landois',
      };
      userService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateUser(userId, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(userService.updateUser).toHaveBeenCalledWith(
        userId,
        updateUserDto,
      );
    });
  });

  // Tests pour supprimer un utilisateur
  describe('deleteUser', () => {
    // Mock le service pour réussir, appelle controller.deleteUser(), vérifie qu'on reçoit undefined (void)
    it('should delete user and return void', async () => {
      const userId = 'a1b2c3';
      userService.deleteUser.mockResolvedValue(undefined);

      const result = await controller.deleteUser(userId);

      // DELETE ne retourne rien (status 204)
      expect(result).toBeUndefined();
      expect(userService.deleteUser).toHaveBeenCalledTimes(1);
      expect(userService.deleteUser).toHaveBeenCalledWith(userId);
    });

    // Mock le service pour lever une erreur, appelle controller.deleteUser(), vérifie que l'erreur remonte
    it('should handle deletion of non-existent user', async () => {
      const userId = 'nonexistent';
      // Le service va lever une erreur si l'utilisateur n'existe pas
      userService.deleteUser.mockRejectedValue(new Error('User not found'));

      await expect(controller.deleteUser(userId)).rejects.toThrow(
        'User not found',
      );
      expect(userService.deleteUser).toHaveBeenCalledWith(userId);
    });
  });
});
