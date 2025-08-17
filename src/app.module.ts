import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MassageModule } from './massage/massage.module';
import { PlanningModule } from './planning/planning.module';

@Module({
  imports: [
    UserModule,
    PrismaModule,
    AuthModule,
    MassageModule,
    PlanningModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
