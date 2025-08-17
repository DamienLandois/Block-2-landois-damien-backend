import { PartialType } from '@nestjs/mapped-types';
import { CreateBookingDto, BookingStatus } from './create-booking.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;
}
