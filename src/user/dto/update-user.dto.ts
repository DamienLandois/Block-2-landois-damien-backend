import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Toutes les propriétés deviennent optionnelles
export class UpdateUserDto extends PartialType(CreateUserDto) {}
