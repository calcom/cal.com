import { redirect } from "next/navigation";

import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const featureRepository = getFeatureRepository();
  const isOnboardingV3Enabled = await featureRepository.checkIfFeatureIsEnabledGlobally("onboarding-v3");

  if (!isOnboardingV3Enabled) {
    redirect("/getting-started");
  }

  return <>{children}</>;
}
