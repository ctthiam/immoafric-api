import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessagingController } from './messaging.controller';
import { MessagingGateway } from './messaging.gateway';
import { MessagingService } from './messaging.service';

@Module({
  imports: [JwtModule],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
