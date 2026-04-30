import { Controller, Post, Get, Body, Req } from '@nestjs/common';
import { EstimationService } from './estimation.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('estimation')
export class EstimationController {
  constructor(private estimation: EstimationService) {}

  @Post()
  @Public()
  async estimate(@Req() req: any, @Body() dto: any) {
    const result = this.estimation.compute(dto);
    const userId = req.user?.sub ?? null;
    if (dto.save !== false) {
      await this.estimation.save(userId, dto, result);
    }
    return result;
  }

  @Post('yield')
  @Public()
  yieldCalc(@Body() dto: { purchasePrice: number; monthlyRent: number; charges?: number }) {
    return this.estimation.yieldCalc(dto);
  }

  @Get('history')
  history(@Req() req: any) {
    return this.estimation.history(req.user.sub);
  }
}
