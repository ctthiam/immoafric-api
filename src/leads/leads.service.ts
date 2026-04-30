import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AssignLeadDto, CreateLeadDto, UpdateLeadStageDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async create(dto: CreateLeadDto) {
    const lead = await this.prisma.lead.create({
      data: {
        agencyId: dto.agencyId,
        propertyId: dto.propertyId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        notes: dto.message,
        isDiaspora: dto.isDiaspora ?? false,
        source: dto.source as any ?? 'immoafric',
        stage: 'new',
      },
      include: {
        property: { select: { title: true, slug: true } },
        agency: { include: { user: true } },
      },
    });

    await this.prisma.property.update({
      where: { id: dto.propertyId },
      data: { contactsCount: { increment: 1 } },
    }).catch(() => null);

    if (lead.agency?.user) {
      await this.mail.sendNewLeadNotification(
        lead.agency.user.email,
        lead.agency.user.firstName,
        dto.name,
        lead.property?.title ?? 'Votre annonce',
        lead.id,
      );
    }

    return { id: lead.id, message: 'Message envoyé avec succès' };
  }

  async findByAgency(userId: string) {
    const agency = await this.prisma.agency.findFirst({ where: { userId } });
    if (!agency) throw new ForbiddenException('Espace professionnel requis');

    return this.prisma.lead.findMany({
      where: { agencyId: agency.id },
      include: {
        property: { select: { id: true, title: true, slug: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStage(id: string, dto: UpdateLeadStageDto, userId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { agency: true },
    });
    if (!lead) throw new NotFoundException();

    const agency = await this.prisma.agency.findFirst({ where: { userId } });
    if (!agency || agency.id !== lead.agencyId) throw new ForbiddenException();

    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'stage_change',
        oldStage: lead.stage,
        newStage: dto.stage,
        content: dto.notes,
      },
    });

    return this.prisma.lead.update({
      where: { id },
      data: {
        stage: dto.stage as any,
        notes: dto.notes ?? lead.notes,
        lostReason: dto.lostReason,
        closedAt: dto.stage === 'closed' ? new Date() : undefined,
      },
    });
  }

  async assign(id: string, dto: AssignLeadDto, userId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, include: { agency: true } });
    if (!lead) throw new NotFoundException();

    const agency = await this.prisma.agency.findFirst({ where: { userId } });
    if (!agency || agency.id !== lead.agencyId) throw new ForbiddenException();

    return this.prisma.lead.update({
      where: { id },
      data: { assignedTo: dto.assignedTo },
    });
  }

  async findOne(id: string, userId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        property: true,
        activities: { orderBy: { createdAt: 'desc' } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!lead) throw new NotFoundException();

    const agency = await this.prisma.agency.findFirst({ where: { userId } });
    if (!agency || agency.id !== lead.agencyId) throw new ForbiddenException();

    return lead;
  }
}
