import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('referral')
export class ReferralController {
  constructor(private referral: ReferralService) {}

  @Get('me')
  getMyReferral(@Req() req: any) {
    return this.referral.getMyReferral(req.user.sub);
  }

  @Post('apply')
  apply(@Req() req: any, @Body() dto: { code: string; agencyId: string }) {
    return this.referral.applyReferral(dto.agencyId, dto.code);
  }

  @Get('leaderboard')
  @Public()
  leaderboard() {
    return this.referral.getLeaderboard();
  }
}
