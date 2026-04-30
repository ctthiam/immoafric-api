import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreatePropertyDto,
  RejectPropertyDto,
  UpdatePropertyDto,
  UpdateStatusDto,
} from './dto/create-property.dto';
import { SearchPropertyDto } from './dto/search-property.dto';
import { PropertiesService } from './properties.service';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly service: PropertiesService) {}

  @Post()
  @Roles('agency', 'agent', 'owner', 'admin')
  create(@Body() dto: CreatePropertyDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get()
  @Public()
  search(@Query() dto: SearchPropertyDto) {
    return this.service.search(dto);
  }

  @Get('pending')
  @Roles('admin')
  getPending() {
    return this.service.getPending();
  }

  @Get('mine')
  myProperties(@CurrentUser('id') userId: string) {
    return this.service.findMyProperties(userId);
  }

  @Get('city/:city')
  @Public()
  findByCity(@Param('city') city: string) {
    return this.service.findByCity(city);
  }

  @Get(':slug')
  @Public()
  findOne(@Param('slug') slug: string) {
    return this.service.findOne(slug);
  }

  @Patch(':id')
  @Roles('agency', 'agent', 'owner', 'admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }

  @Patch(':id/status')
  @Roles('agency', 'agent', 'owner', 'admin')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updateStatus(id, dto, userId);
  }

  @Patch(':id/approve')
  @Roles('admin')
  approve(@Param('id') id: string) {
    return this.service.approve(id);
  }

  @Patch(':id/reject')
  @Roles('admin')
  reject(@Param('id') id: string, @Body() dto: RejectPropertyDto) {
    return this.service.reject(id, dto);
  }

  @Post(':id/images')
  @Roles('agency', 'agent', 'owner', 'admin')
  @UseInterceptors(FilesInterceptor('images', 20))
  uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('id') userId: string,
  ) {
    return this.service.uploadImages(id, files, userId);
  }

  @Delete(':id/images/:imageId')
  @Roles('agency', 'agent', 'owner', 'admin')
  deleteImage(
    @Param('id') propertyId: string,
    @Param('imageId') imageId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.deleteImage(propertyId, imageId, userId);
  }
}
