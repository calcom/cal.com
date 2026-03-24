import type { Plan } from "../../repository/billing/IBillingRepository";
import type { DunningStatus } from "./DunningState";

export function shouldSkipDunningAdvancement(
  planName: Plan | null,
  currentStatus: DunningStatus | null
): boolean {
  if (planName !== "ENTERPRISE") return false;

  return currentStatus !== "CURRENT";
}
