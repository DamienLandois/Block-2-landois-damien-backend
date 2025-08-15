import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) {}

    async getUsers() {
        const users = await this.prisma.user.findMany(
            {
                select: {
                    id: true,
                    firstname: true,
                    name: true,
                    email: true,
                    phoneNumber: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }
        );
        return users;
    }

    async getUser({userId}: {userId: string}) {
        const users = await this.prisma.user.findUnique(
            {
                where: {
                    id: userId,
                },
                select: {
                    id: true,
                    firstname: true,
                    name: true,
                    email: true,
                    phoneNumber: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }
        );
        return users;
    }

    async createUser(data: CreateUserDto) {
    const email = data.email.trim().toLowerCase();
    const passwordHash = await hash(data.password, 11);

    try {
      return await this.prisma.user.create({
        data: {
          email,
          password: passwordHash,
          firstname: data.firstname ?? null,
          name: data.name ?? null,
          phoneNumber: data.phoneNumber ?? null,
        },
        select: {
          id: true,
          email: true,
          firstname: true,
          name: true,
          phoneNumber: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      // P2002 est le code renvoyé par prisma pour email unique déjà pris
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }

  async updateUser(userId: string, data: UpdateUserDto) {
    const updateData: Prisma.UserUpdateInput = {};

    if (data.email !== undefined) updateData.email = data.email.trim().toLowerCase();
    if (data.firstname !== undefined) updateData.firstname = data.firstname ?? null;
    if (data.name !== undefined) updateData.name = data.name ?? null;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber ?? null;

    if (data.password !== undefined) {
      updateData.password = await hash(data.password, 11);
    }

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstname: true,
          name: true,
          phoneNumber: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Email already in use');
        }
        if (error.code === 'P2025') {
          // P2025 est le code renvoyé par prisma quand l'enregistrement à mettre à jour est introuvable
          throw new NotFoundException('User not found');
        }
      }
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id: userId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }
}
