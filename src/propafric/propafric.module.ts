import { Module } from '@nestjs/common';
import { PropafricController } from './propafric.controller';
import { PropafricService } from './propafric.service';

@Module({
  controllers: [PropafricController],
  providers: [PropafricService],
})
export class PropafricModule {}
