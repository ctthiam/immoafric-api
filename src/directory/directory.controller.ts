import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { DirectoryService } from './directory.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('directory')
export class DirectoryController {
  constructor(private dir: DirectoryService) {}

  @Get('categories')
  @Public()
  categories() {
    return this.dir.getCategories();
  }

  @Get()
  @Public()
  findAll(
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dir.findAll({ category, city, country, q, page: page ? +page : 1, limit: limit ? +limit : 12 });
  }

  @Get(':slug')
  @Public()
  findOne(@Param('slug') slug: string) {
    return this.dir.findBySlug(slug);
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: any) {
    return this.dir.create(dto);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.dir.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.dir.remove(id);
  }
}
