import { BillingRepository } from "@/modules/billing/billing.repository";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { StripeService } from "@/modules/stripe/stripe.service";
import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";

export const INCREMENT_JOB = "increment";
export const BILLING_QUEUE = "billing";
export type IncrementJobDataType = {
  oAuthClientId: string;
  bookingId?: number | null;
  startTime?: Date | null;
  endTime?: Date | null;
  userId?: number | null;
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
  async handleIncrement(job: Job) {
    const { oAuthClientId } = job.data as IncrementJobDataType;
    try {
      const team = await this.teamsRepository.findTeamIdFromClientId(oAuthClientId);
      const teamId = team.id;
      if (!team.id) return void 0;

      const billingSubscription = await this.billingRepository.getBillingForTeam(teamId);
      if (!billingSubscription || !billingSubscription?.subscriptionId) {
        this.logger.error("Team did not have stripe subscription associated to it", {
          teamId,
        });
        return void 0;
      }

      const stripeSubscription = await this.stripeService.stripe.subscriptions.retrieve(
        billingSubscription.subscriptionId
      );
      const item = stripeSubscription.items.data[0];
      // legacy plans are licensed, we cannot create usage records against them
      if (item.price?.recurring?.usage_type === "licensed") {
        return void 0;
      }
      await this.stripeService.stripe.subscriptionItems.createUsageRecord(item.id, {
        action: "increment",
        quantity: 1,
        timestamp: "now",
      });
      this.logger.log("Increased usage for subscription", {
        subscriptionId: billingSubscription.subscriptionId,
        teamId,
        oAuthClientId,
        itemId: item.id,
      });
      return void 1;
    } catch (err) {
      this.logger.error("Failed to increase usage for oAuthClient", {
        oAuthClientId,
        err,
      });
      return void 0;
    }
  }
}
