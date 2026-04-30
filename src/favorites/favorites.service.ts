import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const favs = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          select: {
            id: true, slug: true, title: true, price: true, currency: true,
            city: true, type: true, transaction: true, surface: true,
            bedrooms: true, isDiaspora: true, isFeatured: true, isUrgent: true,
            images: { where: { isCover: true }, select: { url: true }, take: 1 },
            agency: { select: { name: true, isVerified: true } },
          },
        },
      },
    });
    return favs.map(f => f.property);
  }

  async toggle(userId: string, propertyId: string): Promise<{ isFavorited: boolean }> {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.favorite.delete({ where: { userId_propertyId: { userId, propertyId } } }),
        this.prisma.property.update({ where: { id: propertyId }, data: { favoritesCount: { decrement: 1 } } }),
      ]);
      return { isFavorited: false };
    }

    await this.prisma.$transaction([
      this.prisma.favorite.create({ data: { userId, propertyId } }),
      this.prisma.property.update({ where: { id: propertyId }, data: { favoritesCount: { increment: 1 } } }),
    ]);
    return { isFavorited: true };
  }

  async check(userId: string, propertyId: string): Promise<{ isFavorited: boolean }> {
    const fav = await this.prisma.favorite.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });
    return { isFavorited: !!fav };
  }

  async getIds(userId: string): Promise<string[]> {
    const favs = await this.prisma.favorite.findMany({ where: { userId }, select: { propertyId: true } });
    return favs.map(f => f.propertyId);
  }
}
