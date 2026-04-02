import { Injectable } from "@nestjs/common";
import { PlatformPlan } from "@/modules/billing/types";

@Injectable()
export class BillingConfigService {
  private readonly config: Map<
    PlatformPlan,
    {
      base: string;
      overage: string;
    }
  >;

  constructor() {
    this.config = new Map<
      PlatformPlan,
      {
        base: string;
        overage: string;
      }
    >();

    const planKeys = Object.keys(PlatformPlan).filter((key) => isNaN(Number(key)));
    for (const key of planKeys) {
      this.config.set(PlatformPlan[key.toUpperCase() as keyof typeof PlatformPlan], {
        base: process.env[`STRIPE_PRICE_ID_${key}`] ?? "",
        overage: process.env[`STRIPE_PRICE_ID_${key}_OVERAGE`] ?? "",
      });
    }
  }

  get(plan: PlatformPlan):
    | {
        base: string;
        overage: string;
      }
    | undefined {
    return this.config.get(plan);
  }
}
