import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";

import { getAppOnboardingUrl } from "./getAppOnboardingUrl";

export const getAppOnboardingRedirectUrl = async (slug: string, teamId?: number, calIdTeamId?: number) => {
  const url = await getAppOnboardingUrl({
    slug,
    teamId,
    calIdTeamId,
    step: AppOnboardingSteps.EVENT_TYPES_STEP,
  });
  return encodeURIComponent(url);
};
