import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsEnum(UserRole, { message: 'Le rôle doit être USER ou ADMIN' })
  role?: UserRole;
}
