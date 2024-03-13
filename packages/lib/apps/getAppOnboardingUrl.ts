import { stringify } from "querystring";

import type { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";

export const getAppOnboardingUrl = ({
  slug,
  step,
  teamId,
  eventTypeId,
}: {
  slug: string;
  step: AppOnboardingSteps;
  teamId?: number;
  eventTypeId?: number;
}) => {
  const params: { [key: string]: string | number } = { slug };
  if (!!eventTypeId) {
    params.eventTypeId = eventTypeId;
  }

  if (!!teamId) {
    params.teamId = teamId;
  }
  const query = stringify(params);

  return `/apps/onboarding/${step}?${query}`;
};
