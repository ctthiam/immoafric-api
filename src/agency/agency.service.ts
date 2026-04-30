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
}
