import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagingService } from './messaging.service';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true },
  namespace: '/messaging',
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private userSockets = new Map<string, string>();

  constructor(
    private messaging: MessagingService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ??
        client.handshake.headers?.cookie?.match(/access_token=([^;]+)/)?.[1];

      if (!token) { client.disconnect(); return; }

      const payload = this.jwt.verify<{ sub: string }>(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      client.data.userId = payload.sub;
      this.userSockets.set(payload.sub, client.id);
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.userSockets.delete(client.data.userId);
    }
  }

  @SubscribeMessage('join_conversation')
  async joinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`conv:${data.conversationId}`);
    const messages = await this.messaging.getMessages(data.conversationId, client.data.userId);
    client.emit('conversation_history', messages);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() data: { conversationId: string; body: string; attachmentUrl?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.body?.trim()) return;

    const message = await this.messaging.sendMessage(data.conversationId, userId, data.body, data.attachmentUrl);

    this.server.to(`conv:${data.conversationId}`).emit('new_message', message);

    const conv = await this.messaging['prisma'].conversation.findUnique({
      where: { id: data.conversationId },
    });
    if (conv) {
      const receiverId = this.messaging.getReceiverId(conv, userId);
      this.server.to(`user:${receiverId}`).emit('notification', {
        type: 'new_message',
        conversationId: data.conversationId,
        preview: data.body.slice(0, 80),
      });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { conversationId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`conv:${data.conversationId}`).emit('user_typing', {
      userId: client.data.userId,
      isTyping: data.isTyping,
    });
  }
}
