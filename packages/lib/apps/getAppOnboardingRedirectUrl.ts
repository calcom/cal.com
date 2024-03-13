import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";

import { getAppOnboardingUrl } from "./getAppOnboardingUrl";

export const getAppOnboardingRedirectUrl = (slug: string, teamId?: number, eventTypeId?: number) => {
  if (eventTypeId) {
    return getAppOnboardingUrl({ slug, eventTypeId, step: AppOnboardingSteps.CONFIGURE_STEP });
  } else if (teamId) {
    return getAppOnboardingUrl({ slug, teamId, step: AppOnboardingSteps.EVENT_TYPES_STEP });
  } else {
    return getAppOnboardingUrl({ slug, step: AppOnboardingSteps.EVENT_TYPES_STEP });
  }
};
