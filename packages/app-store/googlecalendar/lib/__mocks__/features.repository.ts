import { vi } from "vitest";

const mockFeatureRepository = {
  checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
};

const mockUserFeatureRepository = {
  checkIfUserHasFeature: vi.fn().mockResolvedValue(true),
  checkIfUserHasFeatureNonHierarchical: vi.fn().mockResolvedValue(true),
};

vi.mock("@calcom/features/di/containers/FeatureRepository", () => ({
  getFeatureRepository: () => mockFeatureRepository,
}));

vi.mock("@calcom/features/di/containers/UserFeatureRepository", () => ({
  getUserFeatureRepository: () => mockUserFeatureRepository,
}));
