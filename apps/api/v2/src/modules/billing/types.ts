export enum PlatformPlan {
  FREE = "FREE",
  STARTER = "STARTER",
  ESSENTIALS = "ESSENTIALS",
  SCALE = "SCALE",
  ENTERPRISE = "ENTERPRISE",
  PER_ACTIVE_USER = "PER_ACTIVE_USER",
}

export const orderedPlans = [
  "FREE",
  "STARTER",
  "ESSENTIALS",
  "SCALE",
  "PER_ACTIVE_USER",
  "ENTERPRISE",
] as const;

export type PlatformPlanType = (typeof orderedPlans)[number];
