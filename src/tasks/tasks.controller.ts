import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@Roles('agency', 'agent', 'admin')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.service.findByAgency(userId);
  }

  @Get('lead/:leadId')
  findByLead(@Param('leadId') leadId: string, @CurrentUser('id') userId: string) {
    return this.service.findByLead(leadId, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser('id') userId: string) {
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.delete(id, userId);
  }
}
