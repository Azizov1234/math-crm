import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImageFile(file: Express.Multer.File, maxSize: number) {
  if (!file) {
    throw new BadRequestException('File is required');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException('Invalid file type. Allowed: jpeg, png, webp');
  }

  if (file.size > maxSize) {
    throw new BadRequestException(`File size exceeds ${maxSize} bytes`);
  }
}

export function generateUniqueFileName(originalName: string): string {
  const extension = extname(originalName);
  return `${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`;
}
