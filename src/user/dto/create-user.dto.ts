import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description:
      "Mot de passe de l'utilisateur - Minimum 11 caractères avec au moins une majuscule, une minuscule, un chiffre et un symbole",
    example: 'MonMotDePasse123!',
    minLength: 11,
    maxLength: 72,
  })
  @IsString()
  @MinLength(11, {
    message: 'Le mot de passe doit contenir au moins 11 caractères',
  })
  @MaxLength(72)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,./?]).+$/,
    {
      message:
        'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un symbole (!@#$%^&*()_+-=[]{};\'"\\|,./?)',
    },
  )
  password!: string;

  @ApiProperty({
    description: "Prénom de l'utilisateur",
    example: 'Paul',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstname?: string | null;

  @ApiProperty({
    description: "Nom de famille de l'utilisateur",
    example: 'Ochon',
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
