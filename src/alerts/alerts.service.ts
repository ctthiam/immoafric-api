import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: {
    name: string;
    transaction?: string;
    type?: string;
    country?: string;
    city?: string;
    priceMin?: number;
    priceMax?: number;
    surfaceMin?: number;
    bedroomsMin?: number;
    frequency?: 'instant' | 'daily' | 'weekly';
    channel?: 'email' | 'whatsapp' | 'both';
    phone?: string;
  }) {
    return this.prisma.alert.create({ data: { ...dto, userId } });
  }

  async update(id: string, userId: string, dto: Partial<{
    name: string;
    transaction: string;
    type: string;
    city: string;
    priceMin: number;
    priceMax: number;
    surfaceMin: number;
    bedroomsMin: number;
    frequency: 'instant' | 'daily' | 'weekly';
    channel: 'email' | 'whatsapp' | 'both';
    phone: string;
    isActive: boolean;
  }>) {
    await this.assertOwner(id, userId);
    return this.prisma.alert.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    await this.assertOwner(id, userId);
    return this.prisma.alert.delete({ where: { id } });
  }

  async matchNewProperty(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { transaction: true, type: true, country: true, city: true, price: true, surface: true, bedrooms: true },
    });
    if (!property) return;

    const alerts = await this.prisma.alert.findMany({
      where: {
        isActive: true,
        OR: [{ transaction: null }, { transaction: property.transaction }],
        AND: [
          { OR: [{ type: null }, { type: property.type }] },
          { OR: [{ country: null }, { country: property.country }] },
          { OR: [{ city: null }, { city: property.city }] },
          { OR: [{ priceMax: null }, { priceMax: { gte: property.price } }] },
          { OR: [{ priceMin: null }, { priceMin: { lte: property.price } }] },
          { OR: [{ surfaceMin: null }, { surfaceMin: { lte: property.surface ?? 0 } }] },
          { OR: [{ bedroomsMin: null }, { bedroomsMin: { lte: property.bedrooms ?? 0 } }] },
        ],
      },
      include: { user: { select: { email: true } } },
    });

    return alerts.length;
  }

  private async assertOwner(id: string, userId: string) {
    const alert = await this.prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException();
    if (alert.userId !== userId) throw new ForbiddenException();
  }
}
