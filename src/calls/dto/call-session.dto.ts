import { ApiProperty } from '@nestjs/swagger';
import { CallStatus } from '@prisma/client';
import { CallPartyDto } from './call-party.dto';

export class CallSessionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  callerId: string;

  @ApiProperty()
  calleeId: string;

  @ApiProperty({ enum: CallStatus })
  status: CallStatus;

  @ApiProperty({ required: false, nullable: true })
  startedAt?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  acceptedAt?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  endedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: CallPartyDto })
  caller: CallPartyDto;

  @ApiProperty({ type: CallPartyDto })
  callee: CallPartyDto;
}
