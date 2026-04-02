import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { BillingRepository } from "@/modules/billing/billing.repository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { StripeService } from "@/modules/stripe/stripe.service";

export const INCREMENT_JOB = "increment";
export const BILLING_QUEUE = "billing";
export type IncrementJobDataType = {
  userId: number;
};

export type DecrementJobDataType = IncrementJobDataType;

@Processor(BILLING_QUEUE)
export class BillingProcessor {
  private readonly logger = new Logger(BillingProcessor.name);

  constructor(
    public readonly stripeService: StripeService,
    private readonly billingRepository: BillingRepository,
    private readonly teamsRepository: OrganizationsRepository
  ) {}

  @Process(INCREMENT_JOB)
  async handleIncrement(job: Job<IncrementJobDataType>) {
    const { userId } = job.data;
    try {
      // get the platform organization of the managed user
      const team = await this.teamsRepository.findPlatformOrgFromUserId(userId);
      const teamId = team.id;
      if (!team.id) {
        this.logger.error(`User (${userId}) is not part of the platform organization (${teamId}) `, {
          teamId,
          userId,
        });
        return;
      }

      const billingSubscription = await this.billingRepository.getBillingForTeam(teamId);
      if (!billingSubscription || !billingSubscription?.subscriptionId) {
        this.logger.error(`Team ${teamId} did not have stripe subscription associated to it`, {
          teamId,
        });
        return;
      }

      const stripeSubscription = await this.stripeService
        .getStripe()
        .subscriptions.retrieve(billingSubscription.subscriptionId);
      if (!stripeSubscription?.id) {
        this.logger.error(`Failed to retrieve stripe subscription (${billingSubscription.subscriptionId})`, {
          teamId,
          subscriptionId: billingSubscription.subscriptionId,
        });
        return;
      }

      const meteredItem = stripeSubscription.items.data.find(
        (item) => item.price?.recurring?.usage_type === "metered"
      );
      // no metered item found to increase usage, return early
      if (!meteredItem) {
        this.logger.error(`Stripe subscription (${stripeSubscription.id} is not usage based`, {
          teamId,
          subscriptionId: stripeSubscription.id,
        });
        return;
      }

      await this.stripeService.getStripe().subscriptionItems.createUsageRecord(meteredItem.id, {
        action: "increment",
        quantity: 1,
        timestamp: "now",
      });
      this.logger.log("Increased organization usage for subscription", {
        subscriptionId: billingSubscription.subscriptionId,
        teamId,
        userId,
        itemId: meteredItem.id,
      });
    } catch (err) {
      this.logger.error("Failed to increase usage for Organization", {
        userId,
        err,
      });
    }
    return;
  }
}
