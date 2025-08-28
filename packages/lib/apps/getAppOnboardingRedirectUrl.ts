import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";

import { getAppOnboardingUrl } from "./getAppOnboardingUrl";

export const getAppOnboardingRedirectUrl = async (slug: string, teamId?: number) => {
  const url = await getAppOnboardingUrl({ slug, teamId, step: AppOnboardingSteps.EVENT_TYPES_STEP });
  return encodeURIComponent(url);
};
