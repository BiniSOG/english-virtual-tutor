import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser, Public, Roles } from '../common/decorators';
import { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, CreatePlanDto, UpdatePlanDto } from './billing.dto';
import { BillingService } from './billing.service';

@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService, private readonly prisma: PrismaService) {}

  @Public() @Get('plans')
  plans() {
    return this.billing.plans();
  }

  @Post('billing/checkout')
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.billing.checkout(user, dto.planId);
  }

  @Get('billing/verify/:txRef')
  verify(@CurrentUser() user: AuthUser, @Param('txRef') txRef: string) {
    return this.billing.verify(txRef, user.id);
  }

  @Get('billing/payments')
  mine(@CurrentUser() user: AuthUser) {
    return this.billing.myPayments(user.id);
  }

  /** Chapa server-to-server callback (GET with ?trx_ref=...). Always re-verified with Chapa. */
  @Public() @Get('billing/chapa/callback')
  async callback(@Query('trx_ref') trxRef: string, @Query('tx_ref') txRef: string, @Res() res: Response) {
    const ref = trxRef || txRef;
    if (ref) await this.billing.verify(ref).catch(() => undefined);
    res.status(200).json({ received: true });
  }

  /** Chapa webhook (POST). Payload is untrusted — we only use it to know which tx to verify. */
  @Public() @Post('billing/chapa/webhook') @HttpCode(200)
  async webhook(@Body() body: { tx_ref?: string; trx_ref?: string }) {
    const ref = body?.tx_ref || body?.trx_ref;
    if (ref) await this.billing.verify(ref).catch(() => undefined);
    return { received: true };
  }

  // ---------- Admin ----------
  @Roles(Role.ADMIN) @Get('admin/plans')
  adminPlans() {
    return this.prisma.plan.findMany({ orderBy: { order: 'asc' }, include: { _count: { select: { payments: true } } } });
  }
  @Roles(Role.ADMIN) @Post('admin/plans')
  createPlan(@Body() dto: CreatePlanDto) {
    return this.prisma.plan.create({ data: { ...dto, features: dto.features ?? [] } });
  }
  @Roles(Role.ADMIN) @Patch('admin/plans/:id')
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.prisma.plan.update({ where: { id }, data: dto });
  }
  @Roles(Role.ADMIN) @Delete('admin/plans/:id')
  deletePlan(@Param('id') id: string) {
    return this.prisma.plan.update({ where: { id }, data: { isActive: false } });
  }

  @Roles(Role.ADMIN) @Get('admin/payments')
  payments(@Query('status') status?: string) {
    return this.prisma.payment.findMany({
      where: status ? { status: status as 'PENDING' | 'SUCCESS' | 'FAILED' } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { id: true, name: true, email: true } }, plan: { select: { name: true } } },
    });
  }
  @Roles(Role.ADMIN) @Post('admin/payments/:txRef/verify')
  adminVerify(@Param('txRef') txRef: string) {
    return this.billing.verify(txRef);
  }
}
