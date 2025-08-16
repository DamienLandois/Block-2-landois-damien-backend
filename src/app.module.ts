import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MassageModule } from './massage/massage.module';

@Module({
  imports: [UserModule, PrismaModule, AuthModule, MassageModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
