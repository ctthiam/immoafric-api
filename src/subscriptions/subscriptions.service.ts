import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Stripe = require('stripe').default ?? require('stripe');
import { PrismaService } from '../prisma/prisma.service';

export const PLANS = {
  starter: { xof: 25_000, eur: 38, label: 'Starter', maxProperties: 10, maxAgents: 2 },
  pro: { xof: 50_000, eur: 76, label: 'Pro', maxProperties: 50, maxAgents: 10 },
  premium: { xof: 100_000, eur: 152, label: 'Premium', maxProperties: -1, maxAgents: -1 },
};

@Injectable()
export class SubscriptionsService {
  private stripe: any | null = null;
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private prisma: PrismaService, private config: ConfigService) {
    const key = config.get<string>('STRIPE_SECRET_KEY');
    if (key) {
      this.stripe = new Stripe(key);
    } else {
      this.logger.warn('STRIPE_SECRET_KEY manquante — paiements Stripe désactivés');
    }
  }

  async getCurrentPlan(agencyId: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      select: { plan: true, planExpiresAt: true },
    });
    const sub = await this.prisma.subscription.findFirst({
      where: { agencyId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    return { agency, subscription: sub };
  }

  async getHistory(agencyId: string) {
    return this.prisma.subscription.findMany({
      where: { agencyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── PayDunya ─────────────────────────────────────────

  async createPaydunyaCheckout(agencyId: string, dto: {
    plan: 'starter' | 'pro' | 'premium';
    isYearly: boolean;
    returnUrl: string;
  }) {
    const masterKey = this.config.get('PAYDUNYA_MASTER_KEY');
    const privateKey = this.config.get('PAYDUNYA_PRIVATE_KEY');
    const token = this.config.get('PAYDUNYA_TOKEN');
    if (!masterKey || !privateKey || !token) throw new BadRequestException('PayDunya non configuré');

    const plan = PLANS[dto.plan];
    let amount = plan.xof;
    if (dto.isYearly) amount = Math.round(amount * 12 * 0.8);

    const isSandbox = this.config.get('NODE_ENV') !== 'production';
    const baseUrl = isSandbox
      ? 'https://app.paydunya.com/sandbox-api/v1'
      : 'https://app.paydunya.com/api/v1';

    const payload = {
      invoice: {
        total_amount: amount,
        description: `ImmoAfric ${plan.label} — ${dto.isYearly ? 'annuel' : 'mensuel'}`,
      },
      store: { name: 'ImmoAfric' },
      actions: {
        cancel_url: `${dto.returnUrl}?status=cancelled`,
        return_url: `${dto.returnUrl}?status=success`,
        callback_url: `${this.config.get('API_URL')}/subscriptions/webhook/paydunya`,
      },
      custom_data: {
        agencyId,
        plan: dto.plan,
        isYearly: dto.isYearly,
      },
    };

    const res = await fetch(`${baseUrl}/checkout-invoice/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': masterKey,
        'PAYDUNYA-PRIVATE-KEY': privateKey,
        'PAYDUNYA-TOKEN': token,
      },
      body: JSON.stringify(payload),
    });

    const json: any = await res.json();
    if (json.response_code !== '00') throw new BadRequestException(json.response_text ?? 'Erreur PayDunya');
    return { checkoutUrl: json.response_text, token: json.token };
  }

  async handlePaydunyaWebhook(data: any) {
    if (data.data?.status !== 'completed') return;
    const custom = data.data.custom_data ?? {};
    await this.activatePlan(custom.agencyId, custom.plan, custom.isYearly, 'paydunya', data.data.transaction_id, data.data.total_amount);
  }

  // ─── Stripe ───────────────────────────────────────────

  async createStripeCheckout(agencyId: string, dto: {
    plan: 'starter' | 'pro' | 'premium';
    isYearly: boolean;
    returnUrl: string;
  }) {
    if (!this.stripe) throw new BadRequestException('Stripe non configuré');

    const plan = PLANS[dto.plan];
    let amountEur = plan.eur * 100;
    if (dto.isYearly) amountEur = Math.round(amountEur * 12 * 0.8);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `ImmoAfric ${plan.label} — ${dto.isYearly ? 'annuel' : 'mensuel'}` },
          unit_amount: amountEur,
        },
        quantity: 1,
      }],
      metadata: { agencyId, plan: dto.plan, isYearly: String(dto.isYearly) },
      success_url: `${dto.returnUrl}?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${dto.returnUrl}?status=cancelled`,
    });

    return { checkoutUrl: session.url, sessionId: session.id };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    if (!this.stripe) return;
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Webhook signature invalide');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const meta = session.metadata ?? {};
      await this.activatePlan(
        meta.agencyId, meta.plan as any, meta.isYearly === 'true',
        'stripe', session.payment_intent as string,
        (session.amount_total ?? 0) / 100,
      );
    }
  }

  // ─── Shared ───────────────────────────────────────────

  private async activatePlan(
    agencyId: string, plan: 'starter' | 'pro' | 'premium',
    isYearly: boolean, method: string, ref: string, amount: number,
  ) {
    const startsAt = new Date();
    const expiresAt = new Date(startsAt);
    isYearly ? expiresAt.setFullYear(expiresAt.getFullYear() + 1) : expiresAt.setMonth(expiresAt.getMonth() + 1);

    await this.prisma.$transaction([
      this.prisma.agency.update({
        where: { id: agencyId },
        data: { plan, planExpiresAt: expiresAt },
      }),
      this.prisma.subscription.create({
        data: {
          agencyId, plan, isYearly, startsAt, expiresAt, status: 'active',
          amount, currency: method === 'stripe' ? 'EUR' : 'XOF',
          paymentMethod: method as any, paymentRef: ref,
        },
      }),
    ]);
  }
}
