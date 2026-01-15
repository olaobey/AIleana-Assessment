import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class InitiateCallDto {
  @ApiProperty({ example: 'clx1q9m2g0000s8l8q8k9abcd' })
  @IsString()
  @MinLength(10)
  @IsNotEmpty()
  receiverId: string;
}
