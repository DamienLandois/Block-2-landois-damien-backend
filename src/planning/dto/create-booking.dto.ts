import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export class CreateBookingDto {
  @ApiProperty({
    description: 'ID du massage à réserver',
    example: 'clm7r8x9k0000qh8v3d2e1f2g',
  })
  @IsString()
  @IsNotEmpty()
  massageId: string;

  @ApiProperty({
    description: 'ID du créneau horaire choisi',
    example: 'clm7r8x9k0001qh8v3d2e1f2h',
  })
  @IsString()
  @IsNotEmpty()
  timeSlotId: string;

  @ApiProperty({
    description: 'Heure de début souhaitée pour le massage (format ISO)',
    example: '2025-08-18T14:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    description: 'Notes additionnelles pour la réservation (optionnel)',
    example: 'Attention problème de dos.',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
