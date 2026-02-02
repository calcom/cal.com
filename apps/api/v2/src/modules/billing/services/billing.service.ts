import { getIncrementUsageIdempotencyKey, getIncrementUsageJobTag } from "@calcom/platform-libraries/tasker";
import { InjectQueue } from "@nestjs/bull";
import {
  BadRequestException,
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
import { AppConfig } from "@/config/type";
import { PlatformBillingTasker } from "@/lib/services/tasker/platform-billing-tasker.service";
import { BILLING_QUEUE, INCREMENT_JOB, IncrementJobDataType } from "@/modules/billing/billing.processor";
import { BillingRepository } from "@/modules/billing/billing.repository";
import { BillingData, IBillingService } from "@/modules/billing/interfaces/billing-service.interface";
import { BillingConfigService } from "@/modules/billing/services/billing.config.service";
import { PlatformPlan } from "@/modules/billing/types";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { StripeService } from "@/modules/stripe/stripe.service";
import { UsersRepository } from "@/modules/users/users.repository";

@Injectable()
export class BillingService implements IBillingService, OnModuleDestroy {
  private logger = new Logger("BillingService");
  private readonly webAppUrl: string;

  constructor(
    private readonly teamsRepository: OrganizationsRepository,
    public readonly stripeService: StripeService,
    public readonly billingRepository: BillingRepository,
    private readonly configService: ConfigService<AppConfig>,
    private readonly billingConfigService: BillingConfigService,
    private readonly usersRepository: UsersRepository,
    private readonly platformBillingTasker: PlatformBillingTasker,
    @InjectQueue(BILLING_QUEUE) private readonly billingQueue: Queue
  ) {
    this.webAppUrl = this.configService.get("app.baseUrl", { infer: true }) ?? "https://app.cal.com";
  }

  async getBillingData(teamId: number): Promise<BillingData> {
    const teamWithBilling = await this.teamsRepository.findByIdIncludeBilling(teamId);

    if (teamWithBilling?.platformBilling) {
      if (!teamWithBilling?.platformBilling.subscriptionId) {
        return { team: teamWithBilling, status: "no_subscription" as const, plan: "none" };
      } else {
        return {
          team: teamWithBilling,
          status: "valid" as const,
          plan: teamWithBilling.platformBilling.plan as PlatformPlan,
        };
      }
    } else {
      return { team: teamWithBilling, status: "no_billing" as const, plan: "none" };
    }
  }

  async createTeamBilling(teamId: number): Promise<string> {
    const teamWithBilling = await this.teamsRepository.findByIdIncludeBilling(teamId);
    let customerId = teamWithBilling?.platformBilling?.customerId ?? "";

    if (!teamWithBilling?.platformBilling) {
      customerId = await this.teamsRepository.createNewBillingRelation(teamId);

      this.logger.log("Team had no Stripe Customer ID, created one for them.", {
        id: teamId,
        stripeId: customerId,
      });
    }

    return customerId;
  }

  async redirectToSubscribeCheckout(
    teamId: number,
    plan: PlatformPlan,
    customerId?: string
  ): Promise<string> {
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

  async updateSubscriptionForTeam(teamId: number, plan: PlatformPlan): Promise<string> {
    const teamWithBilling = await this.teamsRepository.findByIdIncludeBilling(teamId);
    const customerId = teamWithBilling?.platformBilling?.customerId;

    if (!customerId) {
      throw new NotFoundException("No customer id associated with the team.");
    }

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

  async setPerBookingSubscriptionForTeam(
    teamId: number,
    subscriptionId: string,
    plan: PlatformPlan
  ): Promise<ReturnType<typeof BillingRepository.prototype.updateTeamBilling>> {
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

  async setPerActiveUserSubscriptionForTeam(
    teamId: number,
    subscriptionId: string,
    plan: PlatformPlan,
    priceId: string
  ): Promise<ReturnType<typeof BillingRepository.prototype.updateTeamBilling>> {
    const billingCycleStart = DateTime.now().get("day");
    const billingCycleEnd = DateTime.now().plus({ month: 1 }).get("day");

    return this.billingRepository.updateTeamBilling(
      teamId,
      billingCycleStart,
      billingCycleEnd,
      plan,
      subscriptionId,
      priceId
    );
  }

  async handleStripeSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const teamId = subscription?.metadata?.teamId;
    const plan = PlatformPlan[subscription?.metadata?.plan?.toUpperCase() as keyof typeof PlatformPlan];
    if (teamId && plan) {
      const currentBilling = await this.billingRepository.getBillingForTeam(Number.parseInt(teamId, 10));
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

  async handleStripePaymentSuccess(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);
    const customerId = this.getCustomerIdFromInvoice(invoice);
    if (subscriptionId && customerId) {
      await this.billingRepository.updateBillingOverdue(subscriptionId, customerId, false);
    }
  }

  async handleStripePaymentFailed(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);
    const customerId = this.getCustomerIdFromInvoice(invoice);
    if (subscriptionId && customerId) {
      await this.billingRepository.updateBillingOverdue(subscriptionId, customerId, true);
    }
  }

  async handleStripePaymentPastDue(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);
    const customerId = this.getCustomerIdFromInvoice(invoice);

    if (subscriptionId && customerId) {
      const existingUserSubscription = await this.stripeService
        .getStripe()
        .subscriptions.retrieve(subscriptionId);

      if (existingUserSubscription.status === "past_due") {
        await this.billingRepository.updateBillingOverdue(subscriptionId, customerId, true);
      }

      if (existingUserSubscription.status === "active") {
        await this.billingRepository.updateBillingOverdue(subscriptionId, customerId, false);
      }
    }

    if (!subscriptionId || !customerId) {
      this.logger.log(`SubscriptionId: ${subscriptionId} or customerId: ${customerId} missing`);
    }
  }

  async handleStripeCheckoutEvents(event: Stripe.Event): Promise<void> {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;

    if (!checkoutSession.metadata?.teamId) {
      return;
    }

    const teamId = Number.parseInt(checkoutSession.metadata.teamId, 10);
    const plan = checkoutSession.metadata.plan;
    if (!plan || !teamId) {
      this.logger.log("Webhook received but not pertaining to Platform, discarding.");
      return;
    }
    const isPriceIdPresent = Boolean(checkoutSession.metadata?.priceId);

    if (checkoutSession.mode === "subscription" && isPriceIdPresent) {
      await this.setPerActiveUserSubscriptionForTeam(
        teamId,
        checkoutSession.subscription as string,
        PlatformPlan[plan.toUpperCase() as keyof typeof PlatformPlan],
        checkoutSession.metadata?.priceId
      );
    }

    if (checkoutSession.mode === "subscription" && !isPriceIdPresent) {
      await this.setPerBookingSubscriptionForTeam(
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

  async handleStripeSubscriptionForActiveManagedUsers(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);

    if (!subscriptionId) {
      throw new NotFoundException("No subscription found for team");
    }

    const teamWithBilling = await this.billingRepository.getBillingForTeamBySubscriptionId(subscriptionId);

    if (teamWithBilling?.plan === "PER_ACTIVE_USER") {
      let activeManagedUsersCount = await this.getActiveManagedUsersCount(
        subscriptionId,
        new Date(invoice.period_start * 1000),
        new Date(invoice.period_end * 1000)
      );

      if (activeManagedUsersCount < 0) {
        activeManagedUsersCount = 1;
      }

      const existingSubscription = await this.stripeService
        .getStripe()
        .subscriptions.retrieve(subscriptionId);

      const perActiveUserPrice = this.billingConfigService.get(PlatformPlan.PER_ACTIVE_USER)?.base;
      const subscriptionItem = existingSubscription.items.data.find(
        (item) => item.price?.id === perActiveUserPrice
      );

      if (!subscriptionItem) {
        throw new NotFoundException(
          "No subscription item found for PER_ACTIVE_USER plan with matching price ID"
        );
      }

      await this.stripeService.getStripe().subscriptions.update(subscriptionId, {
        items: [{ id: subscriptionItem.id, quantity: activeManagedUsersCount }],
      });
    }
  }

  async getActiveManagedUsersCount(
    subscriptionId: string,
    invoiceStart: Date,
    invoiceEnd: Date
  ): Promise<number> {
    const managedUsersEmails =
      await this.usersRepository.getOrgsManagedUserEmailsBySubscriptionId(subscriptionId);

    if (!managedUsersEmails) return 0;

    if (!invoiceStart || !invoiceEnd) {
      this.logger.log("Invoice period start or end date is null");
      return 0;
    }

    const activeManagedUserEmailsAsHost = await this.usersRepository.getActiveManagedUsersAsHost(
      subscriptionId,
      invoiceStart,
      invoiceEnd
    );

    const activeHostEmails = activeManagedUserEmailsAsHost.map((email) => email.email);
    const notActiveHostEmails = managedUsersEmails
      .filter((email) => !activeHostEmails.includes(email.email))
      .map((email) => email.email);

    if (notActiveHostEmails.length === 0) return activeManagedUserEmailsAsHost.length;

    const activeManagedUserEmailsAsAttendee = await this.usersRepository.getActiveManagedUsersAsAttendee(
      notActiveHostEmails,
      invoiceStart,
      invoiceEnd
    );

    return activeManagedUserEmailsAsAttendee.length + activeManagedUserEmailsAsHost.length;
  }

  async updateStripeSubscriptionForTeam(teamId: number, plan: PlatformPlan): Promise<void> {
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

    await this.setPerBookingSubscriptionForTeam(
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
  ): Promise<boolean | undefined> {
    if (this.configService.get("e2e")) {
      return true;
    }
    const { uid, startTime, fromReschedule } = booking;

    if (this.configService.get("enableAsyncTasker")) {
      if (fromReschedule) {
        this.platformBillingTasker.rescheduleUsageIncrement({
          payload: { bookingUid: uid, rescheduledTime: startTime },
        });
        return true;
      }
      this.platformBillingTasker.incrementUsage({
        payload: { userId },
        options: {
          delay: startTime,
          tags: [getIncrementUsageJobTag(uid)],
          idempotencyKey: getIncrementUsageIdempotencyKey(uid, userId),
        },
      });
      return true;
    }

    let delay = startTime.getTime() - Date.now();

    if (delay < 0) {
      delay = 0;
    }

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
      { delay: delay, jobId: `increment-${uid}`, removeOnComplete: true }
    );
    this.logger.log(`Added stripe usage increment job for booking ${uid} and user ${userId}`);
  }

  /**
   *
   * Cancels the usage increment job for a booking when it is cancelled.
   * Removing an attendee from a booking does not cancel the usage increment job.
   */
  async cancelUsageByBookingUid(bookingUid: string): Promise<boolean | undefined> {
    if (this.configService.get("e2e")) {
      return true;
    }

    if (this.configService.get("enableAsyncTasker")) {
      await this.platformBillingTasker.cancelUsageIncrement({ payload: { bookingUid } });
      return true;
    }

    const job = await this.billingQueue.getJob(`increment-${bookingUid}`);
    if (job) {
      await job.remove();
      this.logger.log(`Removed increment job for cancelled booking ${bookingUid}`);
    }
  }

  async cancelTeamSubscription(teamId: number): Promise<void> {
    const teamWithBilling = await this.teamsRepository.findByIdIncludeBilling(teamId);
    const customerId = teamWithBilling?.platformBilling?.customerId;

    if (!customerId) {
      throw new NotFoundException("No customer id found for team in Stripe");
    }

    if (!teamWithBilling?.platformBilling || !teamWithBilling?.platformBilling.subscriptionId) {
      throw new NotFoundException("Team plan not found");
    }

    try {
      await this.stripeService
        .getStripe()
        .subscriptions.cancel(teamWithBilling?.platformBilling?.subscriptionId);
    } catch (error) {
      this.logger.log(error, "error while cancelling team subscription in stripe");
      throw new BadRequestException("Failed to cancel team subscription");
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.billingQueue.close();
    } catch (err) {
      this.logger.error(err);
    }
  }
}
