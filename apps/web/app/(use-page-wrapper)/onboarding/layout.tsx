import { redirect } from "next/navigation";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  // Skip feature flag check in E2E tests
  if (process.env.NEXT_PUBLIC_IS_E2E === "1") {
    return <>{children}</>;
  }

  const featuresRepository = new FeaturesRepository(prisma);
  const isOnboardingV3Enabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("onboarding-v3");

  if (!isOnboardingV3Enabled) {
    redirect("/getting-started");
  }

  return <>{children}</>;
}
