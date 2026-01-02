
import type { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";

const stringify = (obj: Record<string, string>): string =>
  new URLSearchParams(obj).toString();


export const getAppOnboardingUrl = ({
  slug,
  step,
  teamId,
}: {
  slug: string;
  step: AppOnboardingSteps;
  teamId?: number;
}): string => {
  const params: { [key: string]: string | number | number[] } = { slug };
  if (!teamId) {
    params.teamId = teamId;
  }
  const query = stringify(params);

  return `/apps/installation/${step}?${query}`;
};
