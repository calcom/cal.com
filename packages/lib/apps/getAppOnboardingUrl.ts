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
  if (slug === "razorpay" && step === AppOnboardingSteps.ACCOUNTS_STEP) {
    const res = await fetch("/api/integrations/razorpay/add", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch razorpay onboarding url");
    }
    const { url } = await res.json();
    return url;
  }

  const params: { [key: string]: string | number | number[] } = { slug };

  if (!!calIdTeamId) {
    params.calIdTeamId = calIdTeamId;
  }
  const query = stringify(params);

  return `/apps/installation/${step}?${query}`;
};
