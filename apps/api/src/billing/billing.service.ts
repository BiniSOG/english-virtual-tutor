import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

const CHAPA_BASE = 'https://api.chapa.co/v1';

/**
 * Payments via Chapa (https://chapa.co) — Ethiopia's leading gateway supporting
 * telebirr, CBE Birr, M-Pesa, Amole, bank cards and more, settled in ETB.
 * The Chapa verify API is always the source of truth before premium is activated.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  plans() {
    return this.prisma.plan.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
  }

  private get webUrl() {
    return (this.config.get<string>('WEB_URL') || 'http://localhost:3000').replace(/\/$/, '');
  }
  private get apiUrl() {
    return (this.config.get<string>('API_PUBLIC_URL') || 'http://localhost:4000').replace(/\/$/, '');
  }
  private get mock() {
    return this.config.get('PAYMENTS_MOCK') === 'true';
  }

  async checkout(user: AuthUser, planId: string) {
    const plan = await this.prisma.plan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) throw new NotFoundException('Plan not found');
    const txRef = `lisan-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const payment = await this.prisma.payment.create({
      data: { userId: user.id, planId: plan.id, txRef, amount: plan.priceEtb, provider: this.mock ? 'mock' : 'chapa' },
    });
    const returnUrl = `${this.webUrl}/checkout/verify?tx_ref=${txRef}`;

    if (this.mock) {
      return { txRef, checkoutUrl: returnUrl };
    }

    const secret = this.config.get<string>('CHAPA_SECRET_KEY');
    if (!secret) throw new ServiceUnavailableException('Payments are not configured yet. Please contact support.');
    const [first, ...rest] = user.name.split(' ');
    const res = await fetch(`${CHAPA_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: String(plan.priceEtb),
        currency: 'ETB',
        email: user.email,
        first_name: first,
        last_name: rest.join(' ') || first,
        tx_ref: txRef,
        callback_url: `${this.apiUrl}/api/billing/chapa/callback`,
        return_url: returnUrl,
        customization: { title: 'Lisan Premium', description: `${plan.name} plan` },
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { status?: string; message?: unknown; data?: { checkout_url?: string } };
    if (!res.ok || body.status !== 'success' || !body.data?.checkout_url) {
      this.logger.error(`Chapa initialize failed: ${JSON.stringify(body)}`);
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', raw: body as Prisma.InputJsonValue } });
      throw new BadRequestException('Could not start the payment. Please try again.');
    }
    await this.prisma.payment.update({ where: { id: payment.id }, data: { checkoutUrl: body.data.checkout_url } });
    return { txRef, checkoutUrl: body.data.checkout_url };
  }

  /** Verifies the transaction with Chapa and activates premium exactly once. */
  async verify(txRef: string, userId?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { txRef }, include: { plan: true } });
    if (!payment || (userId && payment.userId !== userId)) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.PENDING) return this.result(payment.id);

    let ok = false;
    let raw: unknown = null;
    if (payment.provider === 'mock') {
      ok = this.mock;
    } else {
      const secret = this.config.get<string>('CHAPA_SECRET_KEY');
      if (!secret) throw new ServiceUnavailableException('Payments are not configured');
      const res = await fetch(`${CHAPA_BASE}/transaction/verify/${encodeURIComponent(txRef)}`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const body = (await res.json().catch(() => ({}))) as {
        status?: string;
        data?: { status?: string; amount?: number | string; currency?: string };
      };
      raw = body;
      ok =
        res.ok &&
        body.status === 'success' &&
        body.data?.status === 'success' &&
        Number(body.data?.amount) >= payment.amount &&
        body.data?.currency === 'ETB';
      if (!ok && body.data?.status && !['pending', 'success'].includes(body.data.status)) {
        await this.prisma.payment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: { status: 'FAILED', raw: raw as Prisma.InputJsonValue },
        });
      }
    }

    if (ok) {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.payment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: { status: 'SUCCESS', paidAt: new Date(), raw: (raw ?? undefined) as Prisma.InputJsonValue | undefined },
        });
        if (claimed.count !== 1) return; // already processed by webhook/callback
        const user = await tx.user.findUniqueOrThrow({ where: { id: payment.userId } });
        const base = user.premiumUntil && user.premiumUntil > new Date() ? user.premiumUntil : new Date();
        await tx.user.update({
          where: { id: user.id },
          data: { premiumUntil: new Date(base.getTime() + payment.plan.durationDays * 86_400_000) },
        });
      });
    }
    return this.result(payment.id);
  }

  private async result(paymentId: string) {
    const p = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { plan: true, user: { select: { premiumUntil: true } } },
    });
    return {
      txRef: p.txRef,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      plan: p.plan.name,
      paidAt: p.paidAt,
      premiumUntil: p.user.premiumUntil,
    };
  }

  myPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, txRef: true, amount: true, currency: true, status: true, createdAt: true, paidAt: true, plan: { select: { name: true } } },
    });
  }
}
