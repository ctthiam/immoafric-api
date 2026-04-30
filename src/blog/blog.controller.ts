import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { BlogService } from './blog.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('blog')
export class BlogController {
  constructor(private blog: BlogService) {}

  @Get()
  @Public()
  findAll(@Query('category') categorySlug?: string, @Query('country') country?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.blog.findAll({ categorySlug, country, page: page ? +page : 1, limit: limit ? +limit : 12 });
  }

  @Get('categories')
  @Public()
  categories() {
    return this.blog.findCategories();
  }

  @Get(':slug')
  @Public()
  findOne(@Param('slug') slug: string) {
    return this.blog.findBySlug(slug);
  }

  @Post()
  @Roles('admin')
  create(@Req() req: any, @Body() dto: any) {
    return this.blog.create(req.user.sub, dto);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.blog.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.blog.remove(id);
  }
}
