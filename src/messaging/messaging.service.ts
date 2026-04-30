import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateConversation(propertyId: string, senderId: string, receiverId: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: {
        propertyId,
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { propertyId, senderId, receiverId },
      include: { messages: true },
    });
  }

  async getConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      include: {
        property: { select: { id: true, title: true, slug: true, images: { where: { isCover: true }, take: 1 } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessages(conversationId: string, userId: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException();
    if (conv.senderId !== userId && conv.receiverId !== userId) throw new ForbiddenException();

    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });

    return this.prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(conversationId: string, senderId: string, body: string, attachmentUrl?: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException();
    if (conv.senderId !== senderId && conv.receiverId !== senderId) throw new ForbiddenException();

    const message = await this.prisma.message.create({
      data: { conversationId, senderId, body, attachmentUrl },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  getReceiverId(conv: { senderId: string; receiverId: string }, userId: string) {
    return conv.senderId === userId ? conv.receiverId : conv.senderId;
  }
}
