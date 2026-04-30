import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private async getAgency(userId: string) {
    const agency = await this.prisma.agency.findFirst({ where: { userId } });
    if (!agency) throw new ForbiddenException('Espace professionnel requis');
    return agency;
  }

  async create(dto: CreateTaskDto, userId: string) {
    const agency = await this.getAgency(userId);
    return this.prisma.task.create({
      data: {
        agencyId: agency.id,
        assignedTo: dto.assignedTo ?? userId,
        title: dto.title,
        description: dto.description,
        type: dto.type as any ?? 'other',
        dueAt: new Date(dto.dueAt),
        leadId: dto.leadId,
      },
      include: {
        lead: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findByAgency(userId: string) {
    const agency = await this.getAgency(userId);
    return this.prisma.task.findMany({
      where: { agencyId: agency.id },
      include: {
        lead: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ isDone: 'asc' }, { dueAt: 'asc' }],
    });
  }

  async findByLead(leadId: string, userId: string) {
    const agency = await this.getAgency(userId);
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.agencyId !== agency.id) throw new ForbiddenException();

    return this.prisma.task.findMany({
      where: { leadId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ isDone: 'asc' }, { dueAt: 'asc' }],
    });
  }

  async update(id: string, dto: UpdateTaskDto, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id }, include: { agency: true } });
    if (!task) throw new NotFoundException();

    const agency = await this.getAgency(userId);
    if (task.agencyId !== agency.id) throw new ForbiddenException();

    return this.prisma.task.update({
      where: { id },
      data: {
        ...dto,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        doneAt: dto.isDone ? new Date() : undefined,
      },
    });
  }

  async delete(id: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException();
    const agency = await this.getAgency(userId);
    if (task.agencyId !== agency.id) throw new ForbiddenException();
    return this.prisma.task.delete({ where: { id } });
  }
}
