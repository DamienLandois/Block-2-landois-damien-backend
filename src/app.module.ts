import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MassageModule } from './massage/massage.module';
import { PlanningModule } from './planning/planning.module';
import { EmailModule } from './email/email.module';
import { AppLoggerModule } from './common/logger/logger.module';

@Module({
  imports: [
    //rate Limiting global pour prévenir les attaques brute force (désactivé en test)
    ...(process.env.NODE_ENV === 'test'
      ? []
      : [
          ThrottlerModule.forRoot([
            {
              name: 'short',
              ttl: 1000,
              limit: 5,
            },
            {
              name: 'medium',
              ttl: 10000,
              limit: 20,
            },
            {
              name: 'long',
              ttl: 60000,
              limit: 100,
            },
          ]),
        ]),
    MailerModule.forRoot({
      transport:
        process.env.NODE_ENV === 'test'
          ? { jsonTransport: true } // Mode test : pas d'envoi réel
          : {
              host: process.env.SMTP_HOST,
              port: parseInt(process.env.SMTP_PORT || '587'),
              secure: false,
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              },
            },
      defaults: {
        from: `"Raphaëlle Massage" <${process.env.SMTP_USER || 'test@test.com'}>`,
      },
      template: {
        dir: join(__dirname, 'email', 'templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),

    UserModule,
    PrismaModule,
    AuthModule,
    MassageModule,
    PlanningModule,
    EmailModule,
    AppLoggerModule,
  ],
  controllers: [],
  providers: [
    ...(process.env.NODE_ENV === 'test'
      ? []
      : [
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ]),
  ],
})
export class AppModule {}
