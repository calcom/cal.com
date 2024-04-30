import { PlatformPlan } from "@/modules/billing/types";
import { Injectable } from "@nestjs/common";

@Injectable()
export class BillingConfigService {
  private readonly config: Map<PlatformPlan, string>;

  constructor() {
    this.config = new Map<PlatformPlan, string>();

    const planKeys = Object.keys(PlatformPlan).filter((key) => isNaN(Number(key)));
    for (const key of planKeys) {
      this.config.set(
        PlatformPlan[key as keyof typeof PlatformPlan],
        process.env[`STRIPE_PRICE_ID_${key}`] ?? ""
      );
    }
  }

  get(plan: PlatformPlan): string | undefined {
    return this.config.get(plan);
  }
}
