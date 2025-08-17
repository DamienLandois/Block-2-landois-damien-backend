import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMassageDto, UpdateMassageDto } from './dto';

@Injectable()
export class MassageService {
  constructor(private prisma: PrismaService) {}

  async create(createMassageDto: CreateMassageDto, imageName?: string | null) {
    return this.prisma.massage.create({
      data: {
        ...createMassageDto,
        image: imageName || null,
      },
    });
  }

  // Récupérer tous les massages triés par position puis par date
  async findAll() {
    return this.prisma.massage.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const massage = await this.prisma.massage.findUnique({
      where: { id },
    });

    if (!massage) {
      throw new NotFoundException(`Massage avec l'ID ${id} non trouvé`);
    }

    return massage;
  }

  async update(
    id: string,
    updateMassageDto: UpdateMassageDto,
    imageName?: string,
  ) {
    await this.findOne(id);

    const updateData: Record<string, any> = { ...updateMassageDto };
    if (imageName) {
      updateData['image'] = imageName;
    }

    return this.prisma.massage.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    await this.findOne(id);

    return this.prisma.massage.delete({
      where: { id },
    });
  }
}
