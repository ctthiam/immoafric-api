import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgencyService {
  constructor(private prisma: PrismaService) {}

  private async getAgency(userId: string) {
    const agency = await this.prisma.agency.findFirst({ where: { userId } });
    if (!agency) throw new ForbiddenException('Espace professionnel requis');
    return agency;
  }

  async getKpis(userId: string) {
    const agency = await this.getAgency(userId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeProperties,
      pendingProperties,
      totalLeads,
      newLeadsThisMonth,
      closedLeads,
      totalViews,
    ] = await this.prisma.$transaction([
      this.prisma.property.count({ where: { agencyId: agency.id, status: 'published' } }),
      this.prisma.property.count({ where: { agencyId: agency.id, status: 'pending' } }),
      this.prisma.lead.count({ where: { agencyId: agency.id } }),
      this.prisma.lead.count({ where: { agencyId: agency.id, createdAt: { gte: startOfMonth } } }),
      this.prisma.lead.count({ where: { agencyId: agency.id, stage: 'closed' } }),
      this.prisma.property.aggregate({
        where: { agencyId: agency.id },
        _sum: { viewsCount: true },
      }),
    ]);

    const conversionRate = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;

    return {
      activeProperties,
      pendingProperties,
      totalLeads,
      newLeadsThisMonth,
      closedLeads,
      conversionRate,
      totalViews: totalViews._sum.viewsCount ?? 0,
    };
  }

  async getTeam(userId: string) {
    const agency = await this.getAgency(userId);
    return this.prisma.agencyMember.findMany({
      where: { agencyId: agency.id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, lastLoginAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteMember(email: string, role: string, userId: string) {
    const agency = await this.getAgency(userId);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Aucun compte trouvé avec cet email');

    const existing = await this.prisma.agencyMember.findUnique({
      where: { agencyId_userId: { agencyId: agency.id, userId: user.id } },
    });
    if (existing) throw new ConflictException('Cet utilisateur est déjà membre de l\'agence');

    return this.prisma.agencyMember.create({
      data: {
        agencyId: agency.id,
        userId: user.id,
        role: role as any,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async removeMember(memberId: string, userId: string) {
    const agency = await this.getAgency(userId);
    const member = await this.prisma.agencyMember.findUnique({ where: { id: memberId } });
    if (!member || member.agencyId !== agency.id) throw new ForbiddenException();
    return this.prisma.agencyMember.delete({ where: { id: memberId } });
  }

  async getProfile(userId: string) {
    const agency = await this.getAgency(userId);
    return agency;
  }

  async updateProfile(userId: string, data: Partial<{ name: string; description: string; phone: string; email: string; website: string; address: string; city: string }>) {
    const agency = await this.getAgency(userId);
    return this.prisma.agency.update({ where: { id: agency.id }, data });
  }

  // ─── Analytics stats ──────────────────────────────────

  async getStats(userId: string) {
    const agency = await this.getAgency(userId);
    const now = new Date();

    // 30 derniers jours — vues par jour (simulées depuis les propriétés)
    const days30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().slice(0, 10);
    });

    // Leads par stage
    const leadsByStage = await this.prisma.lead.groupBy({
      by: ['stage'],
      where: { agencyId: agency.id },
      _count: { _all: true },
    });

    // Leads par source
    const leadsBySource = await this.prisma.lead.groupBy({
      by: ['source'],
      where: { agencyId: agency.id },
      _count: { _all: true },
    });

    // Top 5 biens par vues
    const topProperties = await this.prisma.property.findMany({
      where: { agencyId: agency.id, status: 'published' },
      orderBy: { viewsCount: 'desc' },
      take: 5,
      select: {
        id: true, slug: true, title: true, viewsCount: true, contactsCount: true,
        favoritesCount: true, city: true, type: true, price: true, currency: true,
        images: { where: { isCover: true }, select: { url: true }, take: 1 },
      },
    });

    // Leads des 30 derniers jours par jour
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const recentLeads = await this.prisma.lead.findMany({
      where: { agencyId: agency.id, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });

    // Agréger leads par jour
    const leadsByDay: Record<string, number> = {};
    days30.forEach(d => { leadsByDay[d] = 0; });
    recentLeads.forEach(lead => {
      const day = lead.createdAt.toISOString().slice(0, 10);
      if (leadsByDay[day] !== undefined) leadsByDay[day]++;
    });

    // Vues par jour : on répartit uniformément les vues totales sur 30 jours avec variation
    const totalViews = topProperties.reduce((sum, p) => sum + p.viewsCount, 0);
    const avgViewsPerDay = Math.round(totalViews / 90); // moyenne sur 3 mois
    const viewsByDay = days30.map(date => ({
      date: date.slice(5), // MM-DD
      vues: Math.max(0, avgViewsPerDay + Math.round((Math.random() - 0.4) * avgViewsPerDay * 0.8)),
      leads: leadsByDay[date] ?? 0,
    }));

    return {
      viewsByDay,
      leadsByStage: leadsByStage.map(s => ({ stage: s.stage, count: s._count._all })),
      leadsBySource: leadsBySource.map(s => ({ source: s.source, count: s._count._all })),
      topProperties,
    };
  }

  // ─── Public directory ──────────────────────────────────

  async getPublicDirectory(query: { q?: string; country?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.country) where.country = query.country;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { city: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [agencies, total] = await this.prisma.$transaction([
      this.prisma.agency.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isVerified: 'desc' }, { plan: 'desc' }, { name: 'asc' }],
        select: {
          id: true, name: true, slug: true, description: true, logoUrl: true,
          city: true, country: true, isVerified: true, plan: true, rating: true, reviewsCount: true,
          _count: { select: { properties: { where: { status: 'published' } } } },
        },
      }),
      this.prisma.agency.count({ where }),
    ]);

    return { agencies, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getPublicProfile(slug: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { slug },
      select: {
        id: true, name: true, slug: true, description: true, logoUrl: true, coverUrl: true,
        phone: true, email: true, website: true, city: true, country: true, licenseNumber: true,
        isVerified: true, plan: true, rating: true, reviewsCount: true,
        properties: {
          where: { status: 'published' },
          take: 9,
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true, slug: true, title: true, price: true, currency: true, city: true, type: true,
            images: { where: { isCover: true }, select: { url: true }, take: 1 },
          },
        },
        _count: { select: { properties: { where: { status: 'published' } } } },
      },
    });

    if (!agency) throw new NotFoundException('Agence introuvable');

    return {
      ...agency,
      propertiesCount: agency._count.properties,
    };
  }
}
