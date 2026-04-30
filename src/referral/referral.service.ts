import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ReferralService {
  constructor(private prisma: PrismaService) {}

  async getMyReferral(userId: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { userId },
      select: { id: true, slug: true, name: true },
    });
    if (!agency) return null;

    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referredAgency: { select: { name: true, createdAt: true, plan: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const code = `REF-${agency.slug.toUpperCase().slice(0, 8)}`;
    return { code, referrals, agency };
  }

  async applyReferral(newAgencyId: string, code: string) {
    const slug = code.replace('REF-', '').toLowerCase();
    const referrerAgency = await this.prisma.agency.findFirst({
      where: { slug: { startsWith: slug } },
      select: { userId: true, id: true },
    });
    if (!referrerAgency) throw new BadRequestException('Code parrainage invalide');

    const exists = await this.prisma.referral.findFirst({
      where: { referredAgencyId: newAgencyId },
    });
    if (exists) throw new BadRequestException('Parrainage déjà appliqué');

    const bonusExpiry = new Date();
    bonusExpiry.setMonth(bonusExpiry.getMonth() + 1);

    await this.prisma.$transaction([
      this.prisma.referral.create({
        data: {
          referrerId: referrerAgency.userId,
          referredAgencyId: newAgencyId,
          bonusAppliedAt: new Date(),
        },
      }),
      // Bonus: 1 month starter free for the referrer
      this.prisma.agency.update({
        where: { id: referrerAgency.id },
        data: {
          plan: 'starter',
          planExpiresAt: bonusExpiry,
        },
      }),
    ]);

    return { success: true };
  }

  async getLeaderboard() {
    const referrals = await this.prisma.referral.groupBy({
      by: ['referrerId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: referrals.map(r => r.referrerId) } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    });

    return referrals.map(r => ({
      count: r._count.id,
      user: users.find(u => u.id === r.referrerId),
    }));
  }
}
