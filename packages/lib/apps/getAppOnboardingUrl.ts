import { stringify } from "querystring";

import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";

export const getAppOnboardingUrl = async ({
  slug,
  step,
  teamId,
  calIdTeamId,
}: {
  slug: string;
  step: AppOnboardingSteps;
  teamId?: number;
  calIdTeamId?: number;
}): Promise<string> => {
  const params: { [key: string]: string | number | number[] } = { slug };

  if (!!calIdTeamId) {
    params.calIdTeamId = calIdTeamId;
  }
  const query = stringify(params);

  return `/apps/installation/${step}?${query}`;
};
