import { redirect } from "next/navigation";

import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const featuresRepository = getFeatureRepository();
  const isOnboardingV3Enabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("onboarding-v3");

  if (!isOnboardingV3Enabled) {
    redirect("/getting-started");
  }

  return <>{children}</>;
}
