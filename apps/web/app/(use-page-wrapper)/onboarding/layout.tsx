import { redirect } from "next/navigation";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const featuresRepository = new FeaturesRepository(prisma);
  const isOnboardingV3Enabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("onboarding-v3");

  if (!isOnboardingV3Enabled) {
    redirect("/getting-started");
  }

  return <>{children}</>;
}
