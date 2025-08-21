import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateMassageDto {
  @ApiProperty({
    description: 'Nom du massage',
    example: 'Massage relaxant',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description du massage',
    example: 'Un massage relaxant pour détendre les muscles',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Durée du massage en minutes',
    example: 60,
    minimum: 1,
    maximum: 300,
  })
  @IsNumber()
  @Min(1)
  @Max(300)
  @Transform(({ value }) => parseInt(value as string, 10))
  duration: number;

  @ApiProperty({
    description: 'Prix du massage en euros',
    example: 50,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value as string))
  price: number;

  @ApiProperty({
    description: 'Position du massage dans la liste',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value as string, 10))
  position: number;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Image du massage (optionnel)',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }): unknown => {
    // Si Swagger envoie une chaîne vide, on la transforme en undefined
    if (value === '' || value === null) {
      return undefined;
    }
    return value;
  })
  image?: any;
}
