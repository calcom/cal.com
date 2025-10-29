import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { PrismaClient } from "@calcom/prisma";

export class OnboardingPathService {
  static async getGettingStartedPath(prisma: PrismaClient): Promise<string> {
    const featuresRepository = new FeaturesRepository(prisma);
    const onboardingV3Enabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("onboarding-v3");
    return onboardingV3Enabled ? "/onboarding/getting-started" : "/getting-started";
  }

  static async getGettingStartedPathWhenInvited(prisma: PrismaClient): Promise<string> {
    const featuresRepository = new FeaturesRepository(prisma);
    const onboardingV3Enabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("onboarding-v3");
    return onboardingV3Enabled ? "/onboarding/personal/settings" : "/getting-started";
  }

  static async getGettingStartedPathWithParams(
    prisma: PrismaClient,
    queryParams?: Record<string, string>
  ): Promise<string> {
    const basePath = await OnboardingPathService.getGettingStartedPath(prisma);

    if (!queryParams || Object.keys(queryParams).length === 0) {
      return basePath;
    }

    const params = new URLSearchParams(queryParams);
    return `${basePath}?${params.toString()}`;
  }
}
