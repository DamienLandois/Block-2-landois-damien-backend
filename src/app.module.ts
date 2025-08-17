import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MassageModule } from './massage/massage.module';
import { PlanningModule } from './planning/planning.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      defaults: {
        from: `"Raphaëlle Massage" <${process.env.SMTP_USER}>`,
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
