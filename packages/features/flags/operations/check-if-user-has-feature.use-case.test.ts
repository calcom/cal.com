import { getUserFeatureRepository } from "@calcom/features/di/containers/UserFeatureRepository";
import { expect, it, vi } from "vitest";
import { checkIfUserHasFeatureUseCase } from "./check-if-user-has-feature.use-case";

vi.mock("@calcom/features/di/containers/UserFeatureRepository", () => ({
  getUserFeatureRepository: vi.fn(),
}));

// This is identical to the test in the controller since the controller currently
// doesn't run any authentication checks or input validation.
it("returns if user has access to feature", async () => {
  const mockUserFeatureRepository = {
    checkIfUserHasFeature: vi.fn(),
  };
  vi.mocked(getUserFeatureRepository).mockReturnValue(mockUserFeatureRepository as any);

  mockUserFeatureRepository.checkIfUserHasFeature.mockResolvedValueOnce(false);
  mockUserFeatureRepository.checkIfUserHasFeature.mockResolvedValueOnce(true);

  const userId = 1;
  await expect(checkIfUserHasFeatureUseCase(userId, "nonexistent-feature")).resolves.toBe(false);
  await expect(checkIfUserHasFeatureUseCase(userId, "mock-feature")).resolves.toBe(true);

  expect(mockUserFeatureRepository.checkIfUserHasFeature).toHaveBeenCalledWith(userId, "nonexistent-feature");
  expect(mockUserFeatureRepository.checkIfUserHasFeature).toHaveBeenCalledWith(userId, "mock-feature");
});
