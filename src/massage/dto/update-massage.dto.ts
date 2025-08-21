import { PartialType } from '@nestjs/swagger';
import { CreateMassageDto } from './create-massage.dto';

export class UpdateMassageDto extends PartialType(CreateMassageDto) {}
