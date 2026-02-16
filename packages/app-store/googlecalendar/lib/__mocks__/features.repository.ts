import { vi } from "vitest";

vi.mock("@calcom/features/di/containers/FeatureRepository", () => ({
  getFeatureRepository: vi.fn(() => ({
    checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock("@calcom/features/di/containers/UserFeatureRepository", () => ({
  getUserFeatureRepository: vi.fn(() => ({
    checkIfUserHasFeature: vi.fn().mockResolvedValue(true),
    checkIfUserHasFeatureNonHierarchical: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock("@calcom/features/di/containers/TeamFeatureRepository", () => ({
  getTeamFeatureRepository: vi.fn(() => ({
    checkIfTeamHasFeature: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn(),
}));

const featuresRepositoryModuleMock = {
  FeaturesRepository: vi.fn().mockImplementation(() => ({
    checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
    checkIfUserHasFeature: vi.fn().mockResolvedValue(true),
    checkIfUserHasFeatureNonHierarchical: vi.fn().mockResolvedValue(true),
  })),
};

vi.mock("@calcom/features/flags/features.repository", () => featuresRepositoryModuleMock);
