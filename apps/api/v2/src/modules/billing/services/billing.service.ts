import { AppConfig } from "@/config/type";
import { BILLING_QUEUE, INCREMENT_JOB, IncrementJobDataType } from "@/modules/billing/billing.processor";
import { BillingRepository } from "@/modules/billing/billing.repository";
import { BillingConfigService } from "@/modules/billing/services/billing.config.service";
import { PlatformPlan } from "@/modules/billing/types";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { StripeService } from "@/modules/stripe/stripe.service";
import { InjectQueue } from "@nestjs/bull";
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bull";
import { DateTime } from "luxon";
import Stripe from "stripe";

@Injectable()
export class BillingService implements OnModuleDestroy {
  private logger = new Logger("BillingService");
  private readonly webAppUrl: string;

  constructor(
    private readonly teamsRepository: OrganizationsRepository,
    public readonly stripeService: StripeService,
    private readonly billingRepository: BillingRepository,
    private readonly configService: ConfigService<AppConfig>,
    private readonly billingConfigService: BillingConfigService,
    @InjectQueue(BILLING_QUEUE) private readonly billingQueue: Queue
  ) {
    this.webAppUrl = this.configService.get("app.baseUrl", { infer: true }) ?? "https://app.cal.com";
  }

  async getBillingData(teamId: number) {
    const teamWithBilling = await this.teamsRepository.findByIdIncludeBilling(teamId);
    if (teamWithBilling?.platformBilling) {
      if (!teamWithBilling?.platformBilling.subscriptionId) {
        return { team: teamWithBilling, status: "no_subscription", plan: "none" };
      }

      return { team: teamWithBilling, status: "valid", plan: teamWithBilling.platformBilling.plan };
    } else {
      return { team: teamWithBilling, status: "no_billing", plan: "none" };
    }
  }

  async createTeamBilling(teamId: number) {
    const teamWithBilling = await this.teamsRepository.findByIdIncludeBilling(teamId);
    let customerId = teamWithBilling?.platformBilling?.customerId;

    if (!teamWithBilling?.platformBilling) {
      customerId = await this.teamsRepository.createNewBillingRelation(teamId);

      this.logger.log("Team had no Stripe Customer ID, created one for them.", {
        id: teamId,
        stripeId: customerId,
      });
    }

    return customerId;
  }

  async redirectToSubscribeCheckout(teamId: number, plan: PlatformPlan, customerId?: string) {
    const { url } = await this.stripeService.getStripe().checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: this.billingConfigService.get(plan)?.base,
          quantity: 1,
        },
        {
          price: this.billingConfigService.get(plan)?.overage,
        },
      ],
      success_url: `${this.webAppUrl}/settings/platform/`,
      cancel_url: `${this.webAppUrl}/settings/platform/`,
      mode: "subscription",
      metadata: {
        teamId: teamId.toString(),
        plan: plan.toString(),
      },
      currency: "usd",
      subscription_data: {
        metadata: {
          teamId: teamId.toString(),
          plan: plan.toString(),
        },
      },
      allow_promotion_codes: true,
    });

    if (!url) throw new InternalServerErrorException("Failed to create Stripe session.");

    return url;
  }

  async updateSubscriptionForTeam(teamId: number, plan: PlatformPlan) {
    const teamWithBilling = await this.teamsRepository.findByIdIncludeBilling(teamId);
    const customerId = teamWithBilling?.platformBilling?.customerId;

    const { url } = await this.stripeService.getStripe().checkout.sessions.create({
      customer: customerId,
      success_url: `${this.webAppUrl}/settings/platform/`,
      cancel_url: `${this.webAppUrl}/settings/platform/plans`,
      mode: "setup",
      metadata: {
        teamId: teamId.toString(),
        plan: plan.toString(),
      },
      currency: "usd",
    });

    if (!url) throw new InternalServerErrorException("Failed to create Stripe session.");

    return url;
  }

  async setSubscriptionForTeam(teamId: number, subscriptionId: string, plan: PlatformPlan) {
    const billingCycleStart = DateTime.now().get("day");
    const billingCycleEnd = DateTime.now().plus({ month: 1 }).get("day");

    return this.billingRepository.updateTeamBilling(
      teamId,
      billingCycleStart,
      billingCycleEnd,
      plan,
      subscriptionId
    );
  }

  async handleStripeSubscriptionDeleted(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    const teamId = subscription?.metadata?.teamId;
    const plan = PlatformPlan[subscription?.metadata?.plan?.toUpperCase() as keyof typeof PlatformPlan];
    if (teamId && plan) {
      const currentBilling = await this.billingRepository.getBillingForTeam(Number.parseInt(teamId));
      if (currentBilling?.subscriptionId === subscription.id) {
        await this.billingRepository.deleteBilling(currentBilling.id);
        this.logger.log(`Stripe Subscription deleted`, {
          customerId: currentBilling.customerId,
          subscriptionId: currentBilling.subscriptionId,
          teamId,
        });
        return;
      }
      this.logger.log("No platform billing found.");
      return;
    }
    this.logger.log("Webhook received but not pertaining to Platform, discarding.");
    return;
  }

  getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
    if (typeof invoice.subscription === "string") {
      return invoice.subscription;
    } else if (invoice.subscription && typeof invoice.subscription === "object") {
      return invoice.subscription.id;
    } else {
      return null;
    }
  }
  getCustomerIdFromInvoice(invoice: Stripe.Invoice): string | null {
    if (typeof invoice.customer === "string") {
      return invoice.customer;
    } else if (invoice.customer && typeof invoice.customer === "object") {
      return invoice.customer.id;
    } else {
      return null;
    }
  }

  async handleStripePaymentSuccess(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);
    const customerId = this.getCustomerIdFromInvoice(invoice);
    if (subscriptionId && customerId) {
      await this.billingRepository.updateBillingOverdue(subscriptionId, customerId, false);
    }
  }

  async handleStripePaymentFailed(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);
    const customerId = this.getCustomerIdFromInvoice(invoice);
    if (subscriptionId && customerId) {
      await this.billingRepository.updateBillingOverdue(subscriptionId, customerId, true);
    }
  }

  async handleStripeCheckoutEvents(event: Stripe.Event) {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;

    if (!checkoutSession.metadata?.teamId) {
      return;
    }

    const teamId = Number.parseInt(checkoutSession.metadata.teamId);
    const plan = checkoutSession.metadata.plan;
    if (!plan || !teamId) {
      this.logger.log("Webhook received but not pertaining to Platform, discarding.");
      return;
    }

    if (checkoutSession.mode === "subscription") {
      await this.setSubscriptionForTeam(
        teamId,
        checkoutSession.subscription as string,
        PlatformPlan[plan.toUpperCase() as keyof typeof PlatformPlan]
      );
    }

    if (checkoutSession.mode === "setup") {
      await this.updateStripeSubscriptionForTeam(teamId, plan as PlatformPlan);
    }

    return;
  }

  async updateStripeSubscriptionForTeam(teamId: number, plan: PlatformPlan) {
    const teamWithBilling = await this.teamsRepository.findByIdIncludeBilling(teamId);

    if (!teamWithBilling?.platformBilling || !teamWithBilling?.platformBilling.subscriptionId) {
      throw new NotFoundException("Team plan not found");
    }

    const existingUserSubscription = await this.stripeService
      .getStripe()
      .subscriptions.retrieve(teamWithBilling?.platformBilling?.subscriptionId);
    const currentLicensedItem = existingUserSubscription.items.data.find(
      (item) => item.price?.recurring?.usage_type === "licensed"
    );
    const currentOverageItem = existingUserSubscription.items.data.find(
      (item) => item.price?.recurring?.usage_type === "metered"
    );

    if (!currentLicensedItem) {
      throw new NotFoundException("There is no licensed item present in the subscription");
    }

    if (!currentOverageItem) {
      throw new NotFoundException("There is no overage item present in the subscription");
    }

    await this.stripeService
      .getStripe()
      .subscriptions.update(teamWithBilling?.platformBilling?.subscriptionId, {
        items: [
          {
            id: currentLicensedItem.id,
            price: this.billingConfigService.get(plan)?.base,
          },
          {
            id: currentOverageItem.id,
            price: this.billingConfigService.get(plan)?.overage,
            clear_usage: false,
          },
        ],
        billing_cycle_anchor: "now",
        proration_behavior: "create_prorations",
      });

    await this.setSubscriptionForTeam(
      teamId,
      teamWithBilling?.platformBilling?.subscriptionId,
      PlatformPlan[plan.toUpperCase() as keyof typeof PlatformPlan]
    );
  }
  /**
   *
   * Adds a job to the queue to increment usage of a stripe subscription.
   * we delay the job until the booking starts.
   * the delay ensure we can adapt to cancel / reschedule.
   */
  async increaseUsageByUserId(
    userId: number,
    booking: {
      uid: string;
      startTime: Date;
      fromReschedule?: string | null;
    }
  ) {
    const { uid, startTime, fromReschedule } = booking;

    const delay = startTime.getTime() - Date.now();
    if (fromReschedule) {
      // cancel the usage increment job for the booking that is being rescheduled
      await this.cancelUsageByBookingUid(fromReschedule);
      this.logger.log(`Cancelled usage increment job for rescheduled booking uid: ${fromReschedule}`);
    }
    await this.billingQueue.add(
      INCREMENT_JOB,
      {
        userId,
      } satisfies IncrementJobDataType,
      { delay: delay > 0 ? delay : 0, jobId: `increment-${uid}`, removeOnComplete: true }
    );
    this.logger.log(`Added stripe usage increment job for booking ${uid} and user ${userId}`);
  }

  /**
   *
   * Cancels the usage increment job for a booking when it is cancelled.
   * Removing an attendee from a booking does not cancel the usage increment job.
   */
  async cancelUsageByBookingUid(bookingUid: string) {
    const job = await this.billingQueue.getJob(`increment-${bookingUid}`);
    if (job) {
      await job.remove();
      this.logger.log(`Removed increment job for cancelled booking ${bookingUid}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.billingQueue.close();
    } catch (err) {
      this.logger.error(err);
    }
  }
}
