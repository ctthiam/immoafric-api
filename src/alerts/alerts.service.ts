import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

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

  // ─── Appelé depuis PropertiesService après publication d'un bien ────
  async matchNewProperty(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true, slug: true, title: true, price: true, currency: true,
        city: true, transaction: true, type: true, country: true,
        surface: true, bedrooms: true,
      },
    });
    if (!property) return 0;

    const alerts = await this.prisma.alert.findMany({
      where: {
        isActive: true,
        frequency: 'instant',
        AND: [
          { OR: [{ transaction: null }, { transaction: property.transaction }] },
          { OR: [{ type: null }, { type: property.type }] },
          { OR: [{ country: null }, { country: property.country }] },
          { OR: [{ city: null }, { city: { contains: property.city, mode: 'insensitive' } }] },
          { OR: [{ priceMax: null }, { priceMax: { gte: property.price } }] },
          { OR: [{ priceMin: null }, { priceMin: { lte: property.price } }] },
          { OR: [{ surfaceMin: null }, { surfaceMin: { lte: property.surface ?? 999999 } }] },
          { OR: [{ bedroomsMin: null }, { bedroomsMin: { lte: property.bedrooms ?? 99 } }] },
        ],
      },
      include: { user: { select: { email: true, firstName: true } } },
    });

    for (const alert of alerts) {
      if (alert.channel === 'email' || alert.channel === 'both') {
        await this.mail.sendAlertMatch(
          alert.user.email,
          alert.user.firstName,
          alert.name,
          [property],
        );
      }
    }

    this.logger.log(`[alerts] ${alerts.length} alertes instant notifiées pour le bien ${property.slug}`);
    return alerts.length;
  }

  // ─── CRON — digest quotidien (chaque jour à 8h WAT) ─────────────────
  @Cron('0 8 * * *', { timeZone: 'Africa/Dakar' })
  async sendDailyDigests() {
    this.logger.log('[cron] Envoi des digests quotidiens d\'alertes…');
    await this.sendDigest('daily', 24);
  }

  // ─── CRON — digest hebdomadaire (lundi à 8h WAT) ────────────────────
  @Cron('0 8 * * 1', { timeZone: 'Africa/Dakar' })
  async sendWeeklyDigests() {
    this.logger.log('[cron] Envoi des digests hebdomadaires d\'alertes…');
    await this.sendDigest('weekly', 168);
  }

  private async sendDigest(frequency: 'daily' | 'weekly', hoursBack: number) {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const alerts = await this.prisma.alert.findMany({
      where: { isActive: true, frequency },
      include: { user: { select: { email: true, firstName: true } } },
    });

    for (const alert of alerts) {
      const properties = await this.prisma.property.findMany({
        where: {
          status: 'published',
          publishedAt: { gte: since },
          AND: [
            alert.transaction ? { transaction: alert.transaction as any } : {},
            alert.type ? { type: alert.type as any } : {},
            alert.country ? { country: alert.country } : {},
            alert.city ? { city: { contains: alert.city, mode: 'insensitive' } } : {},
            alert.priceMax ? { price: { lte: alert.priceMax } } : {},
            alert.priceMin ? { price: { gte: alert.priceMin } } : {},
          ],
        },
        take: 6,
        orderBy: { publishedAt: 'desc' },
        select: {
          slug: true, title: true, price: true, currency: true, city: true,
          transaction: true, type: true, country: true, surface: true, bedrooms: true,
        },
      });

      if (properties.length > 0 && (alert.channel === 'email' || alert.channel === 'both')) {
        await this.mail.sendAlertMatch(
          alert.user.email,
          alert.user.firstName,
          alert.name,
          properties,
        );
        await this.prisma.alert.update({
          where: { id: alert.id },
          data: { lastSentAt: new Date() },
        });
      }
    }

    this.logger.log(`[cron] ${frequency} digest envoyé pour ${alerts.length} alertes`);
  }

  private async assertOwner(id: string, userId: string) {
    const alert = await this.prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException();
    if (alert.userId !== userId) throw new ForbiddenException();
  }
}
