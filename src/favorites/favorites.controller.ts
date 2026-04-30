import { Controller, Get, Post, Param, Req } from '@nestjs/common';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
export class FavoritesController {
  constructor(private favorites: FavoritesService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.favorites.findAll(req.user.sub);
  }

  @Get('ids')
  getIds(@Req() req: any) {
    return this.favorites.getIds(req.user.sub);
  }

  @Get('check/:propertyId')
  check(@Req() req: any, @Param('propertyId') propertyId: string) {
    return this.favorites.check(req.user.sub, propertyId);
  }

  @Post(':propertyId')
  toggle(@Req() req: any, @Param('propertyId') propertyId: string) {
    return this.favorites.toggle(req.user.sub, propertyId);
  }
}
