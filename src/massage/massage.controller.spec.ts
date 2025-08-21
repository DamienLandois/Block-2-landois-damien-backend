import { Test, TestingModule } from '@nestjs/testing';
import { MassageController } from './massage.controller';
import { MassageService } from './massage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMassageDto, UpdateMassageDto } from './dto';

describe('MassageController', () => {
  let controller: MassageController;
  let service: jest.Mocked<MassageService>;
  let jwtGuard: jest.Mocked<any>;
  let rolesGuard: jest.Mocked<any>;

  // Mock du service massage avec toutes ses méthodes
  const mockMassageService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  // Mock du service Prisma pour les tests
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    // Configuration des mocks pour les guards d'authentification
    jwtGuard = { canActivate: jest.fn(() => true) };
    rolesGuard = { canActivate: jest.fn(() => true) };

    // Création du module de test avec tous les providers mockés
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MassageController],
      providers: [
        {
          provide: MassageService,
          useValue: mockMassageService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtGuard)
      .overrideGuard(RolesGuard)
      .useValue(rolesGuard)
      .compile();

    controller = module.get<MassageController>(MassageController);
    service = module.get(MassageService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // On configure les guards pour autoriser l'accès par défaut dans les tests
    jwtGuard.canActivate.mockReturnValue(true);
    rolesGuard.canActivate.mockReturnValue(true);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Tests pour la création d'un massage
  describe('create', () => {
    it('should create a massage with image', async () => {
      const createMassageDto: CreateMassageDto = {
        name: 'Massage relaxant',
        description: 'Un massage apaisant',
        price: 80,
        duration: 60,
        position: 1,
      };

      // Simulation d'un fichier image uploadé
      const mockFile = {
        filename: 'img-123456789.jpg',
      } as Express.Multer.File;

      service.create.mockResolvedValue({
        id: 'massage1',
        ...createMassageDto,
        image: 'img-123456789.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        position: 1,
      });

      const expectedMassage = {
        id: 'massage1',
        ...createMassageDto,
        image: 'img-123456789.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await controller.create(createMassageDto, mockFile);

      expect(service.create).toHaveBeenCalledWith(
        createMassageDto,
        'img-123456789.jpg',
      );
      expect(result).toEqual(expectedMassage);
    });

    it('should create a massage without image', async () => {
      const createMassageDto: CreateMassageDto = {
        name: 'Massage relaxant',
        description: 'Massage pour se détendre et oublié tous ses soucis',
        price: 80,
        duration: 60,
        position: 1,
      };

      // Pas de fichier image uploadé
      const mockFile = undefined;

      service.create.mockResolvedValue({
        id: 'massage1',
        ...createMassageDto,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        position: 1,
      });

      const expectedMassage = {
        id: 'massage1',
        ...createMassageDto,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await controller.create(createMassageDto, mockFile);

      expect(service.create).toHaveBeenCalledWith(createMassageDto, null);
      expect(result).toEqual(expectedMassage);
    });
  });

  // Tests pour la récupération de tous les massages
  describe('findAll', () => {
    it('should return all massages', async () => {
      const expectedMassages = [
        {
          id: 'massage1',
          name: 'Massage relaxant',
          description: 'Description',
          image: 'img-123456789.jpg',
          price: 80,
          duration: 60,
          position: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      service.findAll.mockResolvedValue(expectedMassages);

      const result = await controller.findAll();

      // Vérification que le service est appelé et retourne la bonne liste
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(expectedMassages);
    });
  });

  // Tests pour la récupération d'un massage spécifique
  describe('findOne', () => {
    it('should return a massage by id', async () => {
      const massageId = 'massage1';
      const expectedMassage = {
        id: massageId,
        name: 'Massage relaxant',
        description: 'Description',
        image: 'img-123456789.jpg',
        price: 80,
        duration: 60,
        position: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.findOne.mockResolvedValue(expectedMassage);

      const result = await controller.findOne(massageId);

      // Vérification que le service est appelé avec le bon ID
      expect(service.findOne).toHaveBeenCalledWith(massageId);
      expect(result).toEqual(expectedMassage);
    });
  });

  // Tests pour la modification d'un massage
  describe('update', () => {
    it('should update a massage', async () => {
      const massageId = 'massage1';
      const updateMassageDto: UpdateMassageDto = {
        name: 'Massage relaxant mis à jour',
        price: 90,
      };

      // Massage attendu après modification
      const expectedMassage = {
        id: massageId,
        name: 'Massage relaxant mis à jour',
        description: 'Description',
        image: 'img-123456789.jpg',
        price: 90,
        duration: 60,
        position: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.update.mockResolvedValue(expectedMassage);

      const result = await controller.update(massageId, updateMassageDto);

      // Vérification que le service est appelé avec les bons paramètres
      // ici l'image est undefined car ne met pas a jour l'image
      expect(service.update).toHaveBeenCalledWith(
        massageId,
        updateMassageDto,
        undefined,
      );
      expect(result).toEqual(expectedMassage);
    });
  });

  // Tests pour la suppression d'un massage
  describe('delete', () => {
    it('should delete a massage', async () => {
      const massageId = 'massage1';
      const expectedMassage = {
        id: massageId,
        name: 'Massage relaxant',
        description: 'Description',
        image: 'img-123456789.jpg',
        price: 80,
        duration: 60,
        position: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.delete.mockResolvedValue(expectedMassage);

      const result = await controller.delete(massageId);

      // Vérification que le service est appelé avec le bon ID
      expect(service.delete).toHaveBeenCalledWith(massageId);
      expect(result).toEqual(expectedMassage);
    });
  });
});
