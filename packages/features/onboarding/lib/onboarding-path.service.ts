import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";

export class OnboardingPathService {
  static async getGettingStartedPath(): Promise<string> {
    const featureRepository = getFeatureRepository();
    const onboardingV3Enabled = await featureRepository.checkIfFeatureIsEnabledGlobally("onboarding-v3");

    if (onboardingV3Enabled) {
      return "/onboarding/getting-started";
    }

    return "/getting-started";
  }
}
