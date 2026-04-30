import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AgencyService } from './agency.service';

@Controller('agency')
@Roles('agency', 'agent', 'admin')
export class AgencyController {
  constructor(private readonly service: AgencyService) {}

  @Get('kpis')
  getKpis(@CurrentUser('id') userId: string) {
    return this.service.getKpis(userId);
  }

  @Get('profile')
  getProfile(@CurrentUser('id') userId: string) {
    return this.service.getProfile(userId);
  }

  @Patch('profile')
  updateProfile(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.service.updateProfile(userId, data);
  }

  @Get('team')
  getTeam(@CurrentUser('id') userId: string) {
    return this.service.getTeam(userId);
  }

  @Post('team')
  @Roles('agency', 'admin')
  inviteMember(
    @Body() dto: { email: string; role: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.inviteMember(dto.email, dto.role ?? 'agent', userId);
  }

  @Delete('team/:memberId')
  @Roles('agency', 'admin')
  removeMember(@Param('memberId') memberId: string, @CurrentUser('id') userId: string) {
    return this.service.removeMember(memberId, userId);
  }
}
