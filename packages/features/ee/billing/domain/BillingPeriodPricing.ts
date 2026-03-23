import { BILLING_PLANS, BILLING_PRICING } from "@calcom/features/ee/billing/constants";
import type { BillingPeriod } from "@calcom/prisma/enums";

export class BillingPeriodPricing {
  resolve(period: BillingPeriod, isOrganization: boolean): { priceId: string | null; pricePerSeat: number } {
    return {
      priceId: this.getPriceId(period, isOrganization),
      pricePerSeat: this.getPricePerSeat(period, isOrganization),
    };
  }

  private getPriceId(period: BillingPeriod, isOrganization: boolean): string | null {
    if (isOrganization) {
      return period === "MONTHLY"
        ? (process.env.STRIPE_ORG_MONTHLY_PRICE_ID ?? null)
        : (process.env.STRIPE_ORG_ANNUAL_PRICE_ID ?? null);
    }
    return period === "MONTHLY"
      ? (process.env.STRIPE_TEAM_MONTHLY_PRICE_ID ?? null)
      : (process.env.STRIPE_TEAM_ANNUAL_PRICE_ID ?? null);
  }

  private getPricePerSeat(period: BillingPeriod, isOrganization: boolean): number {
    const plan = isOrganization ? BILLING_PLANS.ORGANIZATIONS : BILLING_PLANS.TEAMS;
    const key = period === "ANNUALLY" ? "annual" : "monthly";
    return BILLING_PRICING[plan][key];
  }
}
