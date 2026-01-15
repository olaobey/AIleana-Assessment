import { ApiProperty } from '@nestjs/swagger';

export class CallPartyDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false, nullable: true })
  firstName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  lastName?: string | null;
}
