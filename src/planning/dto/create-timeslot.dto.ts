import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTimeSlotDto {
  @ApiProperty({
    description: 'Heure de début du créneau (format ISO 8601)',
    example: '2025-08-18T09:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    description: 'Heure de fin du créneau (format ISO 8601)',
    example: '2025-08-18T10:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({
    description:
      'Indique si le créneau est actif et disponible à la réservation',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
