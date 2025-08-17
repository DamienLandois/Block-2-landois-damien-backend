import { PartialType } from '@nestjs/mapped-types';
import { CreateTimeSlotDto } from './create-timeslot.dto';

export class UpdateTimeSlotDto extends PartialType(CreateTimeSlotDto) {}
