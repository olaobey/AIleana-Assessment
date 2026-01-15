import { ApiProperty } from '@nestjs/swagger';
import { CallSessionDto } from './call-session.dto';

class MockSignalingOfferDto {
  @ApiProperty({ example: 'offer' })
  type: 'offer';

  @ApiProperty({ example: 'mock-sdp-offer-data' })
  sdp: string;

  @ApiProperty({ example: 'uuid-of-call-session' })
  callId: string;
}

export class InitiateCallResponseDto {
  @ApiProperty({ type: CallSessionDto })
  call: CallSessionDto;

  @ApiProperty({ example: 'Call initiated successfully' })
  message: string;

  @ApiProperty({ type: MockSignalingOfferDto })
  signalingData: MockSignalingOfferDto;
}
