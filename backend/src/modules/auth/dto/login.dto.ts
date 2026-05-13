import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'username or email' })
  @IsString()
  identifier: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}
