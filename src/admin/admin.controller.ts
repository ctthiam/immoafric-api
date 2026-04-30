import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin')
@Roles('admin')
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.getStats();
  }

  @Get('agencies')
  agencies(
    @Query('page') page?: string,
    @Query('q') q?: string,
    @Query('plan') plan?: string,
  ) {
    return this.admin.getAgencies({ page: page ? +page : 1, q, plan });
  }

  @Patch('agencies/:id/verify')
  verifyAgency(@Param('id') id: string, @Body() dto: { isVerified: boolean }) {
    return this.admin.verifyAgency(id, dto.isVerified);
  }

  @Get('users')
  users(@Query('page') page?: string, @Query('q') q?: string, @Query('role') role?: string) {
    return this.admin.getUsers({ page: page ? +page : 1, q, role });
  }

  @Patch('users/:id/active')
  toggleUser(@Param('id') id: string, @Body() dto: { isActive: boolean }) {
    return this.admin.toggleUserActive(id, dto.isActive);
  }

  @Get('blog')
  blogPosts(@Query('page') page?: string, @Query('status') status?: string) {
    return this.admin.getBlogPosts({ page: page ? +page : 1, status });
  }
}
