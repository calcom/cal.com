import { PlatformPlan } from "@/modules/billing/types";
import { Injectable } from "@nestjs/common";
import * as fs from "node:fs";
import { join } from "path";

@Injectable()
export class BillingConfigService {
  private readonly config: Map<PlatformPlan, string>;

  constructor() {
    this.config = new Map<PlatformPlan, string>();

    const jsonCfg = JSON.parse(fs.readFileSync(join(__dirname, "../../config/stripe.config.json"), "utf-8"));
    for (const key of Object.keys(jsonCfg.plans)) {
      this.config.set(PlatformPlan[key as keyof typeof PlatformPlan], jsonCfg[key] as string);
    }
  }

  get(plan: PlatformPlan): string | undefined {
    return this.config.get(plan);
  }
}
