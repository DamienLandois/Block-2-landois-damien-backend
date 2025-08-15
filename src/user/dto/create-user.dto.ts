import { IsEmail, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // limite raisonnable pour bcrypt
  password!: string;

  @IsOptional()
  @IsString()
  firstname?: string | null;

  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  phoneNumber?: string | null;
}
