import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  massageId: string;

  @IsString()
  @IsNotEmpty()
  timeSlotId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
