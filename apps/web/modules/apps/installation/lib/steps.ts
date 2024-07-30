import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";

export const STEPS = [
  AppOnboardingSteps.ACCOUNTS_STEP,
  AppOnboardingSteps.EVENT_TYPES_STEP,
  AppOnboardingSteps.CONFIGURE_STEP,
] as const;
