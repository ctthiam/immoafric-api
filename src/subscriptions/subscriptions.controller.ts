import { Controller, Get, Post, Body, Req, Headers, RawBodyRequest } from '@nestjs/common';
import { SubscriptionsService, PLANS } from './subscriptions.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subs: SubscriptionsService) {}

  @Get('plans')
  @Public()
  plans() {
    return PLANS;
  }

  @Get('current')
  current(@Req() req: any) {
    return this.subs.getCurrentPlan(req.user.agencyId);
  }

  @Get('history')
  history(@Req() req: any) {
    return this.subs.getHistory(req.user.agencyId);
  }

  @Post('checkout/paydunya')
  paydunyaCheckout(@Req() req: any, @Body() dto: any) {
    return this.subs.createPaydunyaCheckout(req.user.agencyId, dto);
  }

  @Post('checkout/stripe')
  stripeCheckout(@Req() req: any, @Body() dto: any) {
    return this.subs.createStripeCheckout(req.user.agencyId, dto);
  }

  @Post('webhook/paydunya')
  @Public()
  paydunyaWebhook(@Body() body: any) {
    return this.subs.handlePaydunyaWebhook(body);
  }

  @Post('webhook/stripe')
  @Public()
  stripeWebhook(@Req() req: RawBodyRequest<any>, @Headers('stripe-signature') sig: string) {
    return this.subs.handleStripeWebhook(req.rawBody!, sig);
  }
}
