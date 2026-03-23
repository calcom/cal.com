import type { BillingPeriod } from "@calcom/prisma/enums";

export interface BillingState {
  billingPeriod: BillingPeriod | null;
  subscriptionId: string | null;
  subscriptionEnd: Date | null;
}

export type SwitchEligibility =
  | { allowed: true; switchDate?: Date }
  | { allowed: false; reason: "no_subscription" | "already_on_period" | "outside_downgrade_window"; switchDate?: Date };

export interface SwitchPlan {
  targetPeriod: BillingPeriod;
  prorationBehavior: "create_prorations" | "none";
  isImmediate: boolean;
  effectiveDate?: Date;
}

const DOWNGRADE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export class BillingPeriodSwitch {
  constructor(
    private state: BillingState,
    private now: Date = new Date()
  ) {}

  canSwitchTo(target: BillingPeriod): SwitchEligibility {
    if (!this.state.subscriptionId) {
      return { allowed: false, reason: "no_subscription" };
    }

    if (this.state.billingPeriod === target) {
      return { allowed: false, reason: "already_on_period" };
    }

    if (target === "MONTHLY") {
      return this.canDowngrade();
    }

    return { allowed: true };
  }

  planSwitchTo(target: BillingPeriod): SwitchPlan {
    const eligibility = this.canSwitchTo(target);
    if (!eligibility.allowed) {
      throw new BillingPeriodSwitchError(eligibility.reason, eligibility.switchDate);
    }

    if (target === "ANNUALLY") {
      return {
        targetPeriod: "ANNUALLY",
        prorationBehavior: "create_prorations",
        isImmediate: true,
      };
    }

    return {
      targetPeriod: "MONTHLY",
      prorationBehavior: "none",
      isImmediate: false,
      effectiveDate: this.state.subscriptionEnd ?? undefined,
    };
  }

  private canDowngrade(): SwitchEligibility {
    if (!this.state.subscriptionEnd) {
      return { allowed: false, reason: "outside_downgrade_window" };
    }

    const msUntilEnd = this.state.subscriptionEnd.getTime() - this.now.getTime();
    const withinWindow = msUntilEnd <= DOWNGRADE_WINDOW_MS && msUntilEnd > 0;

    if (!withinWindow) {
      return { allowed: false, reason: "outside_downgrade_window", switchDate: this.state.subscriptionEnd };
    }

    return { allowed: true, switchDate: this.state.subscriptionEnd };
  }
}

export class BillingPeriodSwitchError extends Error {
  constructor(
    public readonly reason: "no_subscription" | "already_on_period" | "outside_downgrade_window",
    public readonly switchDate?: Date
  ) {
    const messages: Record<string, string> = {
      no_subscription: "No active subscription",
      already_on_period: "Already on the target billing period",
      outside_downgrade_window: "Cannot switch to monthly billing outside the 30-day window before renewal",
    };
    super(messages[reason]);
    this.name = "BillingPeriodSwitchError";
  }
}
