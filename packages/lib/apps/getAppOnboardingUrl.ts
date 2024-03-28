import { stringify } from "querystring";

import type { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";

export const getAppOnboardingUrl = ({
  slug,
  step,
  teamId,
  eventTypeIds,
}: {
  slug: string;
  step: AppOnboardingSteps;
  teamId?: number;
  eventTypeIds?: number[];
}) => {
  const params: { [key: string]: string | number | number[] } = { slug };
  if (!!eventTypeIds && eventTypeIds.length > 0) {
    params.eventTypeIds = eventTypeIds.join(",");
  }

  if (!!teamId) {
    params.teamId = teamId;
  }
  const query = stringify(params);

  return `/apps/installation/${step}?${query}`;
};
