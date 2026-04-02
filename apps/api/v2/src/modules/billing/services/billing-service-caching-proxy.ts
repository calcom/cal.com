import { Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { BillingData, IBillingService } from "@/modules/billing/interfaces/billing-service.interface";
import { BillingService } from "@/modules/billing/services/billing.service";
import { PlatformPlan } from "@/modules/billing/types";
import { RedisService } from "@/modules/redis/redis.service";

export const REDIS_BILLING_CACHE_KEY = (teamId: number) => `apiv2:team:${teamId}:billing`;
export const BILLING_CACHE_TTL_MS = 3_600_000; // 1 hour

@Injectable()
export class BillingServiceCachingProxy implements IBillingService {
  constructor(
    private readonly billingService: BillingService,
    private readonly redisService: RedisService
  ) {}

  async getBillingData(teamId: number) {
    const cachedBillingData = await this.getBillingCache(teamId);
    if (cachedBillingData) {
      return cachedBillingData;
    }

    const billingData = await this.billingService.getBillingData(teamId);
    await this.setBillingCache(teamId, billingData);
    return billingData;
  }

  private async deleteBillingCache(teamId: number) {
    await this.redisService.del(REDIS_BILLING_CACHE_KEY(teamId));
  }

  private async getBillingCache(teamId: number) {
    const cachedResult = await this.redisService.get<BillingData>(REDIS_BILLING_CACHE_KEY(teamId));
    return cachedResult;
  }

  private async setBillingCache(teamId: number, billingData: BillingData): Promise<void> {
    await this.redisService.set<BillingData>(REDIS_BILLING_CACHE_KEY(teamId), billingData, {
      ttl: BILLING_CACHE_TTL_MS,
    });
  }

  async createTeamBilling(teamId: number): Promise<string> {
    return this.billingService.createTeamBilling(teamId);
  }

  async redirectToSubscribeCheckout(
    teamId: number,
    plan: PlatformPlan,
    customerId?: string
  ): Promise<string> {
    return this.billingService.redirectToSubscribeCheckout(teamId, plan, customerId);
  }

  async updateSubscriptionForTeam(teamId: number, plan: PlatformPlan): Promise<string> {
    return this.billingService.updateSubscriptionForTeam(teamId, plan);
  }

  async cancelTeamSubscription(teamId: number): Promise<void> {
    await this.billingService.cancelTeamSubscription(teamId);
    await this.deleteBillingCache(teamId);
  }

  async handleStripeSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    await this.billingService.handleStripeSubscriptionDeleted(event);
    const subscription = event.data.object as Stripe.Subscription;
    const teamId = subscription?.metadata?.teamId;
    if (teamId) {
      await this.deleteBillingCache(Number.parseInt(teamId));
    }
  }

  async handleStripePaymentSuccess(event: Stripe.Event): Promise<void> {
    await this.billingService.handleStripePaymentSuccess(event);
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);
    if (subscriptionId) {
      const teamBilling =
        await this.billingService.billingRepository.getBillingForTeamBySubscriptionId(subscriptionId);
      if (teamBilling?.id) {
        await this.deleteBillingCache(teamBilling.id);
      }
    }
  }

  async handleStripePaymentFailed(event: Stripe.Event): Promise<void> {
    await this.billingService.handleStripePaymentFailed(event);
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);
    if (subscriptionId) {
      const teamBilling =
        await this.billingService.billingRepository.getBillingForTeamBySubscriptionId(subscriptionId);
      if (teamBilling?.id) {
        await this.deleteBillingCache(teamBilling.id);
      }
    }
  }

  async handleStripePaymentPastDue(event: Stripe.Event): Promise<void> {
    await this.billingService.handleStripePaymentPastDue(event);
    const subscription = event.data.object as Stripe.Subscription;
    const subscriptionId = subscription.id;
    if (subscriptionId) {
      const teamBilling =
        await this.billingService.billingRepository.getBillingForTeamBySubscriptionId(subscriptionId);
      if (teamBilling?.id) {
        await this.deleteBillingCache(teamBilling.id);
      }
    }
  }

  async handleStripeCheckoutEvents(event: Stripe.Event): Promise<void> {
    await this.billingService.handleStripeCheckoutEvents(event);
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    const teamId = checkoutSession.metadata?.teamId;
    if (teamId) {
      await this.deleteBillingCache(Number.parseInt(teamId));
    }
  }

  async handleStripeSubscriptionForActiveManagedUsers(event: Stripe.Event): Promise<void> {
    return this.billingService.handleStripeSubscriptionForActiveManagedUsers(event);
  }

  getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
    return this.billingService.getSubscriptionIdFromInvoice(invoice);
  }

  getCustomerIdFromInvoice(invoice: Stripe.Invoice): string | null {
    return this.billingService.getCustomerIdFromInvoice(invoice);
  }

  get stripeService() {
    return this.billingService.stripeService;
  }
}
