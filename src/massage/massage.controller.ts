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
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import * as fs from 'fs';
import { MassageService } from './massage.service';
import { CreateMassageDto, UpdateMassageDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminOnly } from '../auth/decorators/roles.decorator';
import { ApiOptionalFile } from './decorators/api-optional-file.decorator';
import { EmptyStringToNullInterceptor } from './interceptors/empty-string-to-null.interceptor';

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

@ApiTags('Massages')
@Controller('massages')
export class MassageController {
  constructor(private readonly massageService: MassageService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @UseInterceptors(
    EmptyStringToNullInterceptor,
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Créer un nouveau massage  (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @ApiOptionalFile('image')
  @ApiResponse({ status: 201, description: 'Massage créé avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé - Token JWT requis' })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Droits administrateur requis',
  })
  create(
    @Body() createMassageDto: CreateMassageDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|gif)$/,
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024, // 5MB
        })
        .build({
          fileIsRequired: false,
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    image?: Express.Multer.File,
  ) {
    const imageName = image ? image.filename : null;
    return this.massageService.create(createMassageDto, imageName);
  }

  @Get('images/:filename')
  @ApiOperation({ summary: 'Récupérer l\'URL d\'une image de massage' })
  @ApiParam({
    name: 'filename',
    description: 'Nom du fichier image',
    type: 'string',
  })
  @ApiResponse({ status: 200, description: 'URL de l\'image retournée avec succès' })
  @ApiResponse({ status: 404, description: 'Image non trouvée' })
  getImage(@Param('filename') filename: string) {
    // Vérifier si le fichier existe
    const filePath = join(process.cwd(), 'uploads/images', filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error('Image non trouvée');
    }
    
    // Retourner l'URL de l'image (chemin relatif vers le fichier)
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    return {
      imageUrl: `${baseUrl}/uploads/images/${filename}`,
      filename: filename
    };
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les massages' })
  @ApiResponse({
    status: 200,
    description: 'Liste des massages retournée avec succès',
  })
  findAll() {
    return this.massageService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un massage par son ID' })
  @ApiParam({
    name: 'id',
    description: 'ID du massage',
    type: 'string',
  })
  @ApiResponse({ status: 200, description: 'Massage trouvé' })
  @ApiResponse({ status: 404, description: 'Massage non trouvé' })
  findOne(@Param('id') id: string) {
    return this.massageService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @UseInterceptors(
    EmptyStringToNullInterceptor,
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Modifier un massage  (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'ID du massage à modifier',
    type: 'string',
  })
  @ApiOptionalFile('image')
  @ApiResponse({ status: 200, description: 'Massage modifié avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé - Token JWT requis' })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Droits administrateur requis',
  })
  @ApiResponse({ status: 404, description: 'Massage non trouvé' })
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
  @ApiOperation({ summary: 'Supprimer un massage  (Admin)' })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'ID du massage à supprimer',
    type: 'string',
  })
  @ApiResponse({ status: 200, description: 'Massage supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé - Token JWT requis' })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Droits administrateur requis',
  })
  @ApiResponse({ status: 404, description: 'Massage non trouvé' })
  delete(@Param('id') id: string) {
    return this.massageService.delete(id);
  }
}
