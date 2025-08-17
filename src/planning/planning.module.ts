import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import { join } from 'path';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      defaults: {
        from: '"Raphaëlle" <noreply-raphaelle-massage@gmail.com>', //a configurer demain (appel la cliente)
      },
      template: {
        dir: join(__dirname, '..', 'email', 'templates'),
        adapter: new HandlebarsAdapter(),
        options: { strict: true },
      },
    }),
  ],
  controllers: [PlanningController],
  providers: [PlanningService],
  exports: [PlanningService],
})
export class PlanningModule {}
