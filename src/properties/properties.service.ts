import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MailService } from '../mail/mail.service';
import {
  CreatePropertyDto,
  RejectPropertyDto,
  UpdatePropertyDto,
  UpdateStatusDto,
} from './dto/create-property.dto';
import { SearchPropertyDto } from './dto/search-property.dto';
import { Prisma, PropertyStatus } from '@prisma/client';

@Injectable()
export class PropertiesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private mail: MailService,
  ) {}

  private slugify(title: string, id: string): string {
    return `${title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 70)}-${id.slice(0, 8)}`;
  }

  async create(dto: CreatePropertyDto, userId: string) {
    const agency = await this.prisma.agency.findFirst({ where: { userId } });
    const tempId = Math.random().toString(36).slice(2, 10);
    const slug = this.slugify(dto.title, tempId);

    const property = await this.prisma.property.create({
      data: {
        userId,
        agencyId: agency?.id,
        slug,
        title: dto.title,
        description: dto.description,
        type: dto.type as any,
        transaction: dto.transaction as any,
        country: dto.country ?? 'SN',
        city: dto.city,
        neighborhood: dto.neighborhood,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        price: dto.price,
        pricePeriod: dto.pricePeriod ?? 'total',
        currency: dto.currency ?? 'XOF',
        isNegotiable: dto.isNegotiable ?? false,
        surface: dto.surface,
        rooms: dto.rooms,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        floors: dto.floors,
        parkingSpaces: dto.parkingSpaces,
        condition: dto.condition as any ?? 'old',
        hasTitleDeed: dto.hasTitleDeed ?? false,
        isDiaspora: dto.isDiaspora ?? false,
        amenities: dto.amenities ?? [],
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        status: 'pending',
      },
    });

    return property;
  }

  async search(dto: SearchPropertyDto) {
    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? 12, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyWhereInput = {
      status: 'published',
      ...(dto.transaction && { transaction: dto.transaction as any }),
      ...(dto.type && { type: dto.type as any }),
      ...(dto.city && { city: { contains: dto.city, mode: 'insensitive' } }),
      ...(dto.neighborhood && { neighborhood: { contains: dto.neighborhood, mode: 'insensitive' } }),
      ...(dto.country && { country: dto.country }),
      ...(dto.hasTitleDeed && { hasTitleDeed: true }),
      ...(dto.isDiaspora && { isDiaspora: true }),
      ...(dto.isFeatured && { isFeatured: true }),
      ...((dto.priceMin !== undefined || dto.priceMax !== undefined) && {
        price: {
          ...(dto.priceMin !== undefined && { gte: dto.priceMin }),
          ...(dto.priceMax !== undefined && { lte: dto.priceMax }),
        },
      }),
      ...((dto.surfaceMin !== undefined || dto.surfaceMax !== undefined) && {
        surface: {
          ...(dto.surfaceMin !== undefined && { gte: dto.surfaceMin }),
          ...(dto.surfaceMax !== undefined && { lte: dto.surfaceMax }),
        },
      }),
      ...(dto.bedroomsMin !== undefined && { bedrooms: { gte: dto.bedroomsMin } }),
      ...(dto.roomsMin !== undefined && { rooms: { gte: dto.roomsMin } }),
      ...(dto.q && {
        OR: [
          { title: { contains: dto.q, mode: 'insensitive' } },
          { description: { contains: dto.q, mode: 'insensitive' } },
          { city: { contains: dto.q, mode: 'insensitive' } },
          { neighborhood: { contains: dto.q, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy = this.buildOrderBy(dto.sort);

    const [properties, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: { where: { isCover: true }, take: 1 },
          agency: { select: { id: true, name: true, slug: true, logoUrl: true, isVerified: true } },
        },
      }),
      this.prisma.property.count({ where }),
    ]);

    return {
      properties,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private buildOrderBy(sort?: string): Prisma.PropertyOrderByWithRelationInput[] {
    switch (sort) {
      case 'price_asc': return [{ price: 'asc' }];
      case 'price_desc': return [{ price: 'desc' }];
      case 'views_desc': return [{ viewsCount: 'desc' }];
      default:
        return [{ isSponsored: 'desc' }, { isFeatured: 'desc' }, { publishedAt: 'desc' }];
    }
  }

  async findOne(slug: string) {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        videos: true,
        images360: { orderBy: { sortOrder: 'asc' } },
        agency: {
          select: {
            id: true, name: true, slug: true, logoUrl: true,
            phone: true, email: true, website: true, isVerified: true,
            city: true, rating: true, reviewsCount: true,
          },
        },
        boosts: { where: { isActive: true, endsAt: { gt: new Date() } } },
      },
    });

    if (!property || property.status !== 'published') {
      throw new NotFoundException('Annonce introuvable');
    }

    await this.prisma.property.update({
      where: { id: property.id },
      data: { viewsCount: { increment: 1 } },
    });

    return property;
  }

  async findByAgency(agencyId: string, userId: string) {
    const agency = await this.prisma.agency.findFirst({ where: { userId } });
    if (!agency || agency.id !== agencyId) throw new ForbiddenException();

    return this.prisma.property.findMany({
      where: { agencyId },
      include: { images: { where: { isCover: true }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyProperties(userId: string) {
    return this.prisma.property.findMany({
      where: { userId },
      include: { images: { where: { isCover: true }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdatePropertyDto, userId: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException('Annonce introuvable');
    if (property.userId !== userId) throw new ForbiddenException('Non autorisé');

    return this.prisma.property.update({
      where: { id },
      data: {
        ...dto,
        type: dto.type as any,
        transaction: dto.transaction as any,
        condition: dto.condition as any,
        status: 'pending',
      },
    });
  }

  async updateStatus(id: string, dto: UpdateStatusDto, userId: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException();
    if (property.userId !== userId) throw new ForbiddenException();

    return this.prisma.property.update({
      where: { id },
      data: { status: dto.status as PropertyStatus },
    });
  }

  async uploadImages(propertyId: string, files: Express.Multer.File[], userId: string) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException();
    if (property.userId !== userId) throw new ForbiddenException();

    const urls = await this.storage.uploadMultiple(files, 'properties');
    const existingCount = await this.prisma.propertyImage.count({ where: { propertyId } });

    await this.prisma.propertyImage.createMany({
      data: urls.map((url, i) => ({
        propertyId,
        url,
        isCover: existingCount === 0 && i === 0,
        sortOrder: existingCount + i,
      })),
    });

    return this.prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async deleteImage(propertyId: string, imageId: string, userId: string) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException();
    if (property.userId !== userId) throw new ForbiddenException();

    const image = await this.prisma.propertyImage.findUnique({ where: { id: imageId } });
    if (!image) throw new NotFoundException();

    await this.storage.deleteFile(image.url);
    await this.prisma.propertyImage.delete({ where: { id: imageId } });

    if (image.isCover) {
      const next = await this.prisma.propertyImage.findFirst({
        where: { propertyId },
        orderBy: { sortOrder: 'asc' },
      });
      if (next) {
        await this.prisma.propertyImage.update({ where: { id: next.id }, data: { isCover: true } });
      }
    }
  }

  // ── Admin ──────────────────────────────────────

  async getPending() {
    return this.prisma.property.findMany({
      where: { status: 'pending' },
      include: {
        images: { where: { isCover: true }, take: 1 },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        agency: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!property) throw new NotFoundException();

    const updated = await this.prisma.property.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });

    await this.mail.sendAnnouncementApproved(
      property.user.email,
      property.user.firstName,
      property.title,
      property.slug,
    );

    return updated;
  }

  async reject(id: string, dto: RejectPropertyDto) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!property) throw new NotFoundException();

    const updated = await this.prisma.property.update({
      where: { id },
      data: { status: 'draft' },
    });

    await this.mail.sendAnnouncementRejected(
      property.user.email,
      property.user.firstName,
      property.title,
      dto.reason,
    );

    return updated;
  }

  async findByCity(city: string) {
    return this.prisma.property.findMany({
      where: { city: { equals: city, mode: 'insensitive' }, status: 'published' },
      include: { images: { where: { isCover: true }, take: 1 } },
      orderBy: [{ isSponsored: 'desc' }, { isFeatured: 'desc' }, { publishedAt: 'desc' }],
      take: 50,
    });
  }
}
