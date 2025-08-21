import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';

// Interface pour le type de fichier
interface FileTypeResult {
  mime: string;
  ext: string;
}

@Injectable()
export class FileValidationService {
  //validation sécurisée des fichiers par signature
  async validateFileType(
    filePath: string,
    allowedTypes: string[],
  ): Promise<void> {
    try {
      // Lecture des premiers octets du fichier pour vérification de signature
      const buffer = await fs.readFile(filePath);

      const { fileTypeFromBuffer } = await import('file-type');
      const fileType = await fileTypeFromBuffer(buffer);

      if (!fileType) {
        throw new BadRequestException(
          'Type de fichier non reconnu ou corrompu',
        );
      }

      // Vérification que le type réel correspond aux types autorisés
      if (!allowedTypes.includes(fileType.mime)) {
        throw new BadRequestException(
          `Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(', ')}`,
        );
      }

      this.performSecurityChecks(buffer, fileType);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la validation du fichier');
    }
  }

  //érifications de sécurité supplémentaires
  private performSecurityChecks(
    buffer: Buffer,
    fileType: FileTypeResult,
  ): void {
    // Vérification de la taille maximale (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      throw new BadRequestException('Fichier trop volumineux (max 5MB)');
    }

    // Pour les images, vérifications spécifiques
    if (fileType.mime.startsWith('image/')) {
      this.validateImageSecurity(buffer);
    }
  }

  //validation spécifique pour les images
  private validateImageSecurity(buffer: Buffer): void {
    // Recherche de scripts embarqués (protection XSS)
    const content = buffer.toString('ascii', 0, Math.min(buffer.length, 1024));

    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /svg.*onload/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        throw new BadRequestException(
          'Fichier potentiellement dangereux détecté',
        );
      }
    }
  }

  //nettoyage sécurisé du nom de fichier
  sanitizeFileName(originalName: string): string {
    return originalName
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Remplace caractères dangereux
      .replace(/\.{2,}/g, '.') // Évite les path traversal
      .substring(0, 100); // Limite la longueur
  }

  //types MIME autorisés pour les images
  getAllowedImageTypes(): string[] {
    return [
      'image/jpg',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/tiff',
    ];
  }
}
