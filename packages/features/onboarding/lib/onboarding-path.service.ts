import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";

export class OnboardingPathService {
  static async getGettingStartedPath(): Promise<string> {
    const featureRepository = getFeatureRepository();
    const onboardingV3Enabled = await featureRepository.checkIfFeatureIsEnabledGlobally("onboarding-v3");
    return onboardingV3Enabled ? "/onboarding/getting-started" : "/getting-started";
  }

  static async getGettingStartedPathWhenInvited(): Promise<string> {
    const featureRepository = getFeatureRepository();
    const onboardingV3Enabled = await featureRepository.checkIfFeatureIsEnabledGlobally("onboarding-v3");
    return onboardingV3Enabled ? "/onboarding/personal/settings" : "/getting-started";
  }

  static async getGettingStartedPathWithParams(queryParams?: Record<string, string>): Promise<string> {
    const basePath = await OnboardingPathService.getGettingStartedPath();

    if (!queryParams || Object.keys(queryParams).length === 0) {
      return basePath;
    }

    const params = new URLSearchParams(queryParams);
    return `${basePath}?${params.toString()}`;
  }
}
