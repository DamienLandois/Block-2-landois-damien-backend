import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
