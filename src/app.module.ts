import { Module } from '@nestjs/common';
<<<<<<< Updated upstream
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
=======
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [UserModule, PrismaModule, AuthModule],
  controllers: [],
  providers: [],
>>>>>>> Stashed changes
})
export class AppModule {}
