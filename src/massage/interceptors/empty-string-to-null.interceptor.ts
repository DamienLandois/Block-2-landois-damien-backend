import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class EmptyStringToNullInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();

    // Si le body contient des chaînes vides, les convertir en null ou undefined
    if (req.body && typeof req.body === 'object') {
      const body = req.body as Record<string, unknown>;
      Object.keys(body).forEach((key) => {
        if (body[key] === '') {
          delete body[key];
        }
      });
    }

    return next.handle();
  }
}
