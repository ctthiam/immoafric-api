import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AssignLeadDto, CreateLeadDto, UpdateLeadStageDto } from './dto/create-lead.dto';
import { LeadsService } from './leads.service';

@Controller('leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Post()
  @Public()
  create(@Body() dto: CreateLeadDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles('agency', 'agent', 'admin')
  findAll(@CurrentUser('id') userId: string) {
    return this.service.findByAgency(userId);
  }

  @Get(':id')
  @Roles('agency', 'agent', 'admin')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.findOne(id, userId);
  }

  @Patch(':id/stage')
  @Roles('agency', 'agent', 'admin')
  updateStage(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStageDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updateStage(id, dto, userId);
  }

  @Patch(':id/assign')
  @Roles('agency', 'admin')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignLeadDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.assign(id, dto, userId);
  }
}
