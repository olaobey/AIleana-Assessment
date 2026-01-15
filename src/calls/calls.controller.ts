import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { InitiateCallDto } from './dto/initiate-call.dto';
import { UpdateCallDto } from './dto/update-call.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { InitiateCallResponseDto } from './dto/initiate-call.response.dto';
import { CallSessionDto } from './dto/call-session.dto';

type JwtUser = { userId: string; email: string };

@ApiTags('Calls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate a call' })
  @ApiOkResponse({ type: InitiateCallResponseDto })
  async initiateCall(
    @CurrentUser() user: JwtUser,
    @Body() dto: InitiateCallDto,
  ): Promise<InitiateCallResponseDto> {
    return this.callsService.initiateCall(user.userId, dto.receiverId);
  }

  @Patch('update')
  @ApiOperation({ summary: 'Update call status' })
  @ApiOkResponse({ type: CallSessionDto })
  async updateCallStatus(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateCallDto,
  ): Promise<CallSessionDto> {
    return this.callsService.updateCallStatus(
      dto.callId,
      dto.status,
      user.userId,
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Get call history' })
  @ApiOkResponse({ type: [CallSessionDto] })
  async getCallHistory(
    @CurrentUser() user: JwtUser,
  ): Promise<CallSessionDto[]> {
    return this.callsService.getCallHistory(user.userId);
  }

  @Get(':callId')
  @ApiOperation({ summary: 'Get call details' })
  @ApiOkResponse({ type: CallSessionDto })
  async getCallById(
    @CurrentUser() user: JwtUser,
    @Param('callId') callId: string,
  ): Promise<CallSessionDto> {
    return this.callsService.getCallById(callId, user.userId);
  }
}
