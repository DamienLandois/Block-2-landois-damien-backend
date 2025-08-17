import { Test, TestingModule } from '@nestjs/testing';
import { MassageService } from './massage.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { CreateMassageDto, UpdateMassageDto } from './dto';

describe('MassageService', () => {
  let service: MassageService;
  let prismaService: any;

  const mockPrismaService = {
    massage: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MassageService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MassageService>(MassageService);
    prismaService = module.get(PrismaService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  //créer un massage avec des données valides
  describe('create', () => {
    it('should create a new massage', async () => {
      const createMassageDto: CreateMassageDto = {
        title: 'Massage relaxant',
        description: 'Un massage pour se détendre',
        price: 80,
        duration: 60,
        position: 1,
      };

      const imageName = 'test-image.jpg';

      const expectedMassage = {
        id: 'massage1',
        ...createMassageDto,
        image: imageName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.massage.create.mockResolvedValue(expectedMassage);

      const result = await service.create(createMassageDto, imageName);

      expect(prismaService.massage.create).toHaveBeenCalledWith({
        data: {
          ...createMassageDto,
          image: imageName,
        },
      });
      expect(result).toEqual(expectedMassage);
    });
  });

  //récupérer la liste complète des massages
  describe('findAll', () => {
    it('should return all massages ordered by position then by creation date', async () => {
      const expectedMassages = [
        {
          id: 'massage1',
          title: 'Massage relaxant',
          description: 'Description',
          image: 'https://example.com/image.jpg',
          price: 80,
          duration: 60,
          position: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaService.massage.findMany.mockResolvedValue(expectedMassages);

      const result = await service.findAll();

      expect(prismaService.massage.findMany).toHaveBeenCalledWith({
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      });
      expect(result).toEqual(expectedMassages);
    });
  });

  //chercher un massage spécifique par son ID
  describe('findOne', () => {
    it('should return a massage by id', async () => {
      const massageId = 'massage1';
      const expectedMassage = {
        id: massageId,
        title: 'Massage relaxant',
        description: 'Description',
        image: 'https://example.com/image.jpg',
        price: 80,
        duration: 60,
        position: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.massage.findUnique.mockResolvedValue(expectedMassage);

      const result = await service.findOne(massageId);

      expect(prismaService.massage.findUnique).toHaveBeenCalledWith({
        where: { id: massageId },
      });
      expect(result).toEqual(expectedMassage);
    });

    //erreur quand le massage n'existe pas
    it('should throw NotFoundException when massage not found', async () => {
      const massageId = 'nonexistent';
      prismaService.massage.findUnique.mockResolvedValue(null);

      await expect(service.findOne(massageId)).rejects.toThrow(
        new NotFoundException(`Massage avec l'ID ${massageId} non trouvé`),
      );
    });
  });

  //modifier un massage existant
  describe('update', () => {
    it('should update a massage', async () => {
      const massageId = 'massage1';
      const updateMassageDto: UpdateMassageDto = {
        title: 'Massage relaxant mis à jour',
        price: 90,
      };

      const existingMassage = {
        id: massageId,
        title: 'Massage relaxant',
        description: 'Description',
        image: 'https://example.com/image.jpg',
        price: 80,
        duration: 60,
        position: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedMassage = {
        ...existingMassage,
        ...updateMassageDto,
        updatedAt: new Date(),
      };

      prismaService.massage.findUnique.mockResolvedValue(existingMassage);
      prismaService.massage.update.mockResolvedValue(updatedMassage);

      const result = await service.update(massageId, updateMassageDto);

      expect(prismaService.massage.findUnique).toHaveBeenCalledWith({
        where: { id: massageId },
      });

      expect(prismaService.massage.update).toHaveBeenCalledWith({
        where: { id: massageId },
        data: updateMassageDto,
      });

      expect(result).toEqual(updatedMassage);
    });

    //erreur lors de la modification d'un massage inexistant
    it('should throw NotFoundException when updating non-existent massage', async () => {
      const massageId = 'nonexistent';
      const updateMassageDto: UpdateMassageDto = { title: 'New title' };

      prismaService.massage.findUnique.mockResolvedValue(null);

      await expect(service.update(massageId, updateMassageDto)).rejects.toThrow(
        new NotFoundException(`Massage avec l'ID ${massageId} non trouvé`),
      );
    });
  });

  //supprimer un massage qui existe
  describe('delete', () => {
    it('should delete a massage', async () => {
      const massageId = 'massage1';
      const existingMassage = {
        id: massageId,
        title: 'Massage relaxant',
        description: 'Description',
        image: 'https://example.com/image.jpg',
        price: 80,
        duration: 60,
        position: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.massage.findUnique.mockResolvedValue(existingMassage);
      prismaService.massage.delete.mockResolvedValue(existingMassage);

      const result = await service.delete(massageId);

      expect(prismaService.massage.findUnique).toHaveBeenCalledWith({
        where: { id: massageId },
      });
      expect(prismaService.massage.delete).toHaveBeenCalledWith({
        where: { id: massageId },
      });
      expect(result).toEqual(existingMassage);
    });

    //erreur lors de la suppression d'un massage qui n'existe pas
    it('should throw NotFoundException when deleting non-existent massage', async () => {
      const massageId = 'nonexistent';
      prismaService.massage.findUnique.mockResolvedValue(null);

      await expect(service.delete(massageId)).rejects.toThrow(
        new NotFoundException(`Massage avec l'ID ${massageId} non trouvé`),
      );
    });
  });
});
