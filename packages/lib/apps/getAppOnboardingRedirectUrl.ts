import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";

import { getAppOnboardingUrl } from "./getAppOnboardingUrl";

export const getAppOnboardingRedirectUrl = (slug: string, teamId?: number, eventTypeId?: number) => {
  let url = "";
  if (eventTypeId) {
    url = getAppOnboardingUrl({ slug, eventTypeId, step: AppOnboardingSteps.CONFIGURE_STEP });
  } else if (teamId) {
    url = getAppOnboardingUrl({ slug, teamId, step: AppOnboardingSteps.EVENT_TYPES_STEP });
  } else {
    url = getAppOnboardingUrl({ slug, step: AppOnboardingSteps.EVENT_TYPES_STEP });
  }
  return encodeURIComponent(url);
};
