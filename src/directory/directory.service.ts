import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const PROFESSIONAL_CATEGORIES = [
  { key: 'notaire', label: 'Notaires', icon: '⚖️' },
  { key: 'architecte', label: 'Architectes', icon: '📐' },
  { key: 'banque', label: 'Banques & crédit', icon: '🏦' },
  { key: 'assurance', label: 'Assurances', icon: '🛡️' },
  { key: 'geometre', label: 'Géomètres', icon: '📏' },
  { key: 'demenagement', label: 'Déménagement', icon: '🚛' },
  { key: 'renovation', label: 'Rénovation', icon: '🔨' },
  { key: 'evaluation', label: 'Expertise & évaluation', icon: '🔍' },
];

@Injectable()
export class DirectoryService {
  constructor(private prisma: PrismaService) {}

  getCategories() {
    return PROFESSIONAL_CATEGORIES;
  }

  async findAll(query: {
    category?: string;
    city?: string;
    country?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.category) where.category = query.category;
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
    if (query.country) where.country = query.country;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.professional.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { plan: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.professional.count({ where }),
    ]);

    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findBySlug(slug: string) {
    const pro = await this.prisma.professional.findUnique({ where: { slug } });
    if (!pro) throw new NotFoundException('Professionnel introuvable');
    return pro;
  }

  async create(dto: {
    name: string;
    category: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    city?: string;
    country?: string;
    license?: string;
  }) {
    return this.prisma.professional.create({ data: dto });
  }

  async update(id: string, dto: Partial<{
    name: string; description: string; logoUrl: string; phone: string;
    email: string; website: string; address: string; city: string;
    isVerified: boolean; isFeatured: boolean; plan: 'free' | 'paid';
  }>) {
    return this.prisma.professional.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.professional.delete({ where: { id } });
  }
}
