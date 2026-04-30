import { Controller, Get, Post, Patch, Delete, Body, Param, Req } from '@nestjs/common';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private alerts: AlertsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.alerts.findAll(req.user.sub);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.alerts.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.alerts.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.alerts.remove(id, req.user.sub);
  }
}
