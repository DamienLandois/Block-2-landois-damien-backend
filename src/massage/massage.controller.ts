import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import { MassageService } from './massage.service';
import { CreateMassageDto, UpdateMassageDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminOnly } from '../auth/decorators/roles.decorator';

// Configuration pour l'upload d'images
const imageStorage = diskStorage({
  destination: './uploads/images',
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `massage-${uniqueSuffix}${ext}`);
  },
});

// Filtre pour accepter uniquement les fichiers image
const imageFilter = (
  req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
    callback(null, true);
  } else {
    callback(new Error('Seuls les fichiers image sont autorisés!'), false);
  }
};

@Controller('massages')
export class MassageController {
  constructor(private readonly massageService: MassageService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  create(
    @Body() createMassageDto: CreateMassageDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const imageName = image ? image.filename : null;
    return this.massageService.create(createMassageDto, imageName);
  }

  @Get('images/:filename')
  getImage(@Param('filename') filename: string, @Res() res: Response) {
    return res.sendFile(join(process.cwd(), 'uploads/images', filename));
  }

  @Get()
  findAll() {
    return this.massageService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.massageService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  update(
    @Param('id') id: string,
    @Body() updateMassageDto: UpdateMassageDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    // Si une nouvelle image est fournie, on l'utilise, sinon on garde l'ancienne
    const imageName = image ? image.filename : undefined;
    return this.massageService.update(id, updateMassageDto, imageName);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  delete(@Param('id') id: string) {
    return this.massageService.delete(id);
  }
}
