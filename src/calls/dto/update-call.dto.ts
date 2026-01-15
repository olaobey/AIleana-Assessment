import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { CallStatus } from '@prisma/client';

export class UpdateCallDto {
  @ApiProperty({ example: 'uuid-of-call-session' })
  @IsUUID()
  callId: string;

  @ApiProperty({ enum: CallStatus, example: CallStatus.ACCEPTED })
  @IsEnum(CallStatus)
  status: CallStatus;
}
