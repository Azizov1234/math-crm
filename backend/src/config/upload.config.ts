import { registerAs } from '@nestjs/config';

export default registerAs('upload', () => ({
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE ?? '2097152', 10),
}));
