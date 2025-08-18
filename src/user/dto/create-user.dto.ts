import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'client@example.com',
    format: 'email',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: "Mot de passe de l'utilisateur",
    example: 'motdepasse123',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({
    description: "Prénom de l'utilisateur",
    example: 'Marie',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstname?: string | null;

  @ApiProperty({
    description: "Nom de famille de l'utilisateur",
    example: 'Dupont',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiProperty({
    description: "Numéro de téléphone de l'utilisateur",
    example: '06 12 34 56 78',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string | null;
}
