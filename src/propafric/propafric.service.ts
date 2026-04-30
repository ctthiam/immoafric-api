import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { BulkImportDto, RegisterAgencyDto, SyncPropertyDto } from './dto/sync-property.dto';

type PropertyStatus = 'draft' | 'pending' | 'published' | 'sold' | 'rented' | 'archived';
type PropertyType = 'apartment' | 'villa' | 'house' | 'land' | 'office' | 'commercial' | 'building' | 'parking' | 'other';
type PropertyTransaction = 'sale' | 'rent' | 'rent_furnished' | 'new_construction';

@Injectable()
export class PropafricService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  verifyHmac(rawBody: string, signature: string, secret: string): boolean {
    const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  async findAgencyByApiKey(apiKey: string) {
    const agency = await this.prisma.agency.findUnique({ where: { propafrApiKey: apiKey } });
    if (!agency) throw new UnauthorizedException('Invalid PropAfric API key');
    return agency;
  }

  async findAgencyByExternalId(externalId: string) {
    const agency = await this.prisma.agency.findUnique({ where: { propafrAgencyId: externalId } });
    if (!agency) throw new NotFoundException(`Agency with PropAfric ID ${externalId} not found`);
    return agency;
  }

  private mapStatus(propafrStatus?: string): PropertyStatus {
    switch (propafrStatus) {
      case 'rented': return 'rented';
      case 'sold': return 'sold';
      case 'inactive': return 'archived';
      default: return 'published';
    }
  }

  private slugify(text: string, suffix: string): string {
    return `${text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60)}-${suffix}`;
  }

  async upsertProperty(dto: SyncPropertyDto, agencyId: string, agencyUserId: string): Promise<void> {
    const propafrExtId = `${dto.agencyExternalId}_${dto.externalId}`;
    const slug = this.slugify(dto.title, dto.externalId);

    const propertyData = {
      agencyId,
      userId: agencyUserId,
      slug,
      title: dto.title,
      description: dto.description,
      type: dto.type as PropertyType,
      transaction: dto.transaction as PropertyTransaction,
      country: dto.country ?? 'SN',
      city: dto.city,
      neighborhood: dto.neighborhood,
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      price: dto.price,
      pricePeriod: dto.pricePeriod ?? 'total',
      currency: dto.currency ?? 'XOF',
      surface: dto.surface,
      rooms: dto.rooms,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      amenities: dto.amenities ?? [],
      status: this.mapStatus(dto.status),
      propafrExtId,
      publishedAt: new Date(),
    };

    const existing = await this.prisma.property.findUnique({ where: { propafrExtId } });

    if (existing) {
      await this.prisma.property.update({
        where: { propafrExtId },
        data: { ...propertyData, slug: existing.slug },
      });
      await this.syncImages(existing.id, dto.imageUrls ?? []);
    } else {
      const created = await this.prisma.property.create({ data: propertyData });
      await this.syncImages(created.id, dto.imageUrls ?? []);
    }
  }

  private async syncImages(propertyId: string, imageUrls: string[]): Promise<void> {
    if (!imageUrls.length) return;
    await this.prisma.propertyImage.deleteMany({ where: { propertyId } });
    await this.prisma.propertyImage.createMany({
      data: imageUrls.map((url, i) => ({
        propertyId,
        url,
        isCover: i === 0,
        sortOrder: i,
      })),
    });
  }

  async syncWebhook(rawBody: string, signature: string, dto: SyncPropertyDto): Promise<{ synced: number }> {
    const agency = await this.findAgencyByExternalId(dto.agencyExternalId);

    if (agency.propafrSecret) {
      const valid = this.verifyHmac(rawBody, signature, agency.propafrSecret);
      if (!valid) throw new UnauthorizedException('Invalid HMAC signature');
    }

    await this.upsertProperty(dto, agency.id, agency.userId);
    await this.prisma.agency.update({
      where: { id: agency.id },
      data: { propafrLastSync: new Date(), propafrSyncStatus: 'ok' },
    });

    return { synced: 1 };
  }

  async bulkImport(dto: BulkImportDto, apiKey: string): Promise<{ synced: number; errors: number }> {
    const agency = await this.findAgencyByApiKey(apiKey);

    if (dto.agencyExternalId !== agency.propafrAgencyId) {
      throw new UnauthorizedException('Agency mismatch');
    }

    let synced = 0;
    let errors = 0;

    for (const propDto of dto.properties) {
      try {
        await this.upsertProperty(propDto, agency.id, agency.userId);
        synced++;
      } catch {
        errors++;
      }
    }

    await this.prisma.agency.update({
      where: { id: agency.id },
      data: {
        propafrLastSync: new Date(),
        propafrSyncStatus: errors === 0 ? 'ok' : 'partial',
      },
    });

    return { synced, errors };
  }

  async getStatus(agencyId: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      select: {
        id: true,
        name: true,
        isPropafric: true,
        propafrAgencyId: true,
        propafrApiKey: true,
        propafrLastSync: true,
        propafrSyncStatus: true,
      },
    });
    if (!agency) throw new NotFoundException('Agency not found');

    const propertiesCount = await this.prisma.property.count({
      where: { agencyId, propafrExtId: { not: null } },
    });

    return { ...agency, propertiesCount };
  }

  async registerAgency(dto: RegisterAgencyDto) {
    const agency = await this.prisma.agency.findUnique({ where: { id: dto.agencyId } });
    if (!agency) throw new NotFoundException('Agency not found');

    const apiKey = `pak_${crypto.randomBytes(24).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');

    return this.prisma.agency.update({
      where: { id: dto.agencyId },
      data: {
        isPropafric: true,
        propafrAgencyId: dto.propafrAgencyId,
        propafrApiKey: apiKey,
        propafrSecret: secret,
        propafrSyncStatus: 'registered',
      },
      select: {
        id: true,
        name: true,
        propafrAgencyId: true,
        propafrApiKey: true,
        propafrSecret: true,
      },
    });
  }
}
