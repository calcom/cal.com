export class OnboardingPathService {
  static async getGettingStartedPath(): Promise<string> {
    return "/onboarding/getting-started";
  }

  static async getGettingStartedPathWhenInvited(): Promise<string> {
    return "/onboarding/personal/settings";
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
