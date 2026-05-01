import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers, newUsersMonth,
      totalAgencies, verifiedAgencies,
      totalProperties, publishedProperties, pendingProperties,
      totalLeads, leadsMonth,
      totalRevenue,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.agency.count(),
      this.prisma.agency.count({ where: { isVerified: true } }),
      this.prisma.property.count(),
      this.prisma.property.count({ where: { status: 'published' } }),
      this.prisma.property.count({ where: { status: 'pending' } }),
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.subscription.aggregate({ _sum: { amount: true }, where: { status: 'active' } }),
    ]);

    return {
      users: { total: totalUsers, thisMonth: newUsersMonth },
      agencies: { total: totalAgencies, verified: verifiedAgencies },
      properties: { total: totalProperties, published: publishedProperties, pending: pendingProperties },
      leads: { total: totalLeads, thisMonth: leadsMonth },
      mrr: totalRevenue._sum.amount ?? 0,
    };
  }

  async getAgencies(query: { page?: number; limit?: number; q?: string; plan?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.plan) where.plan = query.plan;

    const [agencies, total] = await this.prisma.$transaction([
      this.prisma.agency.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
          _count: { select: { properties: true, leads: true } },
        },
      }),
      this.prisma.agency.count({ where }),
    ]);

    return { agencies, total, page, totalPages: Math.ceil(total / limit) };
  }

  async verifyAgency(agencyId: string, isVerified: boolean) {
    return this.prisma.agency.update({ where: { id: agencyId }, data: { isVerified } });
  }

  async getUsers(query: { page?: number; q?: string; role?: string }) {
    const page = query.page ?? 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.q) {
      where.OR = [
        { email: { contains: query.q, mode: 'insensitive' } },
        { firstName: { contains: query.q, mode: 'insensitive' } },
        { lastName: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.role) where.role = query.role;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isVerified: true, isActive: true, createdAt: true,
          country: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, totalPages: Math.ceil(total / limit) };
  }

  async toggleUserActive(userId: string, isActive: boolean) {
    return this.prisma.user.update({ where: { id: userId }, data: { isActive } });
  }

  async getPayments(query: { page?: number; plan?: string }) {
    const page = query.page ?? 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.plan) where.plan = query.plan;

    const [subs, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { agency: { select: { name: true, slug: true, city: true, country: true } } },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { subscriptions: subs, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getDirectory(query: { page?: number; q?: string; category?: string }) {
    const page = query.page ?? 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.q) where.name = { contains: query.q, mode: 'insensitive' };
    if (query.category) where.category = query.category;

    const [pros, total] = await this.prisma.$transaction([
      this.prisma.professional.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.professional.count({ where }),
    ]);

    return { professionals: pros, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateProfessional(id: string, data: { isVerified?: boolean; isFeatured?: boolean }) {
    return this.prisma.professional.update({ where: { id }, data });
  }

  async getPropafricAgencies() {
    return this.prisma.agency.findMany({
      where: { isPropafric: true },
      orderBy: { propafrLastSync: 'desc' },
      select: {
        id: true, name: true, slug: true, city: true, country: true,
        propafrAgencyId: true, propafrLastSync: true, propafrSyncStatus: true, plan: true,
        _count: { select: { properties: true } },
      },
    });
  }

  async getBlogPosts(query: { page?: number; status?: string }) {
    const page = query.page ?? 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.status) where.status = query.status;

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { category: true, author: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return { posts, total, page, totalPages: Math.ceil(total / limit) };
  }
}
