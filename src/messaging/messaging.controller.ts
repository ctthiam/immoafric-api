import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/user.decorator';
import { MessagingService } from './messaging.service';

@Controller('messaging')
export class MessagingController {
  constructor(private readonly service: MessagingService) {}

  @Get('conversations')
  getConversations(@CurrentUser('id') userId: string) {
    return this.service.getConversations(userId);
  }

  @Post('conversations')
  startConversation(
    @Body() dto: { propertyId: string; receiverId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.getOrCreateConversation(dto.propertyId, userId, dto.receiverId);
  }

  @Get('conversations/:id/messages')
  getMessages(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.getMessages(id, userId);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body() dto: { body: string; attachmentUrl?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.sendMessage(id, userId, dto.body, dto.attachmentUrl);
  }
}
