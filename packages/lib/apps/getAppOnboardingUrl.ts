import { stringify } from "querystring";

import type { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";

export const getAppOnboardingUrl = ({
  slug,
  step,
  teamId,
}: {
  slug: string;
  step: AppOnboardingSteps;
  teamId?: number;
}) => {
  const params: { [key: string]: string | number | number[] } = { slug };
  if (!!teamId) {
    params.teamId = teamId;
  }
  const query = stringify(params);

  return `/apps/installation/${step}?${query}`;
};
