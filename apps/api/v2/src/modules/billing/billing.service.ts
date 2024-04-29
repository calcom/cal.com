import { AppConfig } from "@/config/type";
import { BillingRepository } from "@/modules/billing/billing.repository";
import { PlatformPlan } from "@/modules/billing/types";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { StripeService } from "@/modules/stripe/stripe.service";
import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DateTime } from "luxon";
import Stripe from "stripe";

@Injectable()
export class BillingService {
  private logger = new Logger("BillingService");
  private plansToPriceId: Map<PlatformPlan, string>;
  private readonly webAppUrl: string;

  constructor(
    private readonly teamsRepository: OrganizationsRepository,
    public readonly stripeService: StripeService,
    private readonly billingRepository: BillingRepository,
    private readonly configService: ConfigService<AppConfig>
  ) {
    this.webAppUrl = configService.get("app.baseUrl", { infer: true }) ?? "https://app.cal.com";
    this.plansToPriceId = new Map<PlatformPlan, string>();
    this.plansToPriceId.set(PlatformPlan.ESSENTIALS, "price_1MelNEH8UDiwIftkmpXkd5DF");
    // for (const plan in Object.keys(PlatformPlan)) {
    //   const planId = configService.get<string>(`billing.${plan}`) ?? "";
    //   this.plansToPriceId.set(plan as PlatformPlan, planId);
    // }
  }

  async getBillingData(teamId: number) {
    const teamWithBilling = await this.teamsRepository.findByIdIncludeBilling(teamId);
    if (teamWithBilling?.platformBilling) {
      if (!teamWithBilling?.platformBilling.subscriptionId) {
        return { team: teamWithBilling, status: "no_subscription" };
      }

      return { team: teamWithBilling, status: "valid" };
    } else {
      return { team: teamWithBilling, status: "no_billing" };
    }
  }

  async createSubscriptionForTeam(teamId: number, plan: PlatformPlan) {
    const teamWithBilling = await this.teamsRepository.findByIdIncludeBilling(teamId);
    let brandNewBilling = false;

    let customerId = teamWithBilling?.platformBilling?.customerId;

    if (!teamWithBilling?.platformBilling) {
      brandNewBilling = true;
      customerId = await this.teamsRepository.createNewBillingRelation(teamId);

      this.logger.log("Team had no Stripe Customer ID, created one for them.", {
        id: teamId,
        stripeId: customerId,
      });
    }

    if (brandNewBilling || !teamWithBilling?.platformBilling?.subscriptionId) {
      const { url } = await this.stripeService.stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: this.plansToPriceId.get(plan),
            quantity: 1,
          },
        ],
        success_url: `${this.webAppUrl}/settings/platform/oauth-clients`,
        cancel_url: `${this.webAppUrl}/settings/platform/oauth-clients`,
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
      });

      if (!url) throw new InternalServerErrorException("Failed to create Stripe session.");

      return { action: "redirect", url };
    }

    return { action: "none" };
  }

  async setSubscriptionForTeam(teamId: number, subscription: Stripe.Subscription, plan: PlatformPlan) {
    const billingCycleStart = DateTime.now().get("day");
    const billingCycleEnd = DateTime.now().plus({ month: 1 }).get("day");

    return this.billingRepository.updateTeamBilling(
      teamId,
      billingCycleStart,
      billingCycleEnd,
      plan,
      subscription.id
    );
  }

  async increaseUsageForTeam(teamId: number) {
    // TODO - if we support multiple subscription items per team, we may need to track which plan they're
    // subscribed to so we can do one less query.
    const billingSubscription = await this.billingRepository.getBillingForTeam(teamId);
    if (!billingSubscription || !billingSubscription?.subscriptionId) {
      throw new Error(`Failed to increase usage for team ${teamId}`);
    }

    const stripeSubscription = await this.stripeService.stripe.subscriptions.retrieve(
      billingSubscription.subscriptionId
    );
    const items = stripeSubscription.items.data[0]; // first (and only) subscription item.
    await this.stripeService.stripe.subscriptionItems.createUsageRecord(items.id, {
      action: "increment",
      quantity: 1,
      timestamp: "now",
    });
  }

  async increaseUsageByClientId(clientId: string) {
    const team = await this.billingRepository.findTeamIdFromClientId(clientId);
    if (!team.id) return Promise.resolve(); // noop resolution.

    return this.increaseUsageForTeam(team?.id);
  }
}
