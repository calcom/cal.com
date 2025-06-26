import { vi } from "vitest";

const featuresRepositoryModuleMock = {
  FeaturesRepository: vi.fn().mockImplementation(() => ({
    checkIfFeatureIsEnabledGlobally: vi.fn().mockImplementation((feature: string) => {
      if (feature === "calendar-cache") {
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    }),
  })),
};

vi.mock("@calcom/features/flags/features.repository", () => featuresRepositoryModuleMock);
