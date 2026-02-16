import { getUserFeatureRepository } from "@calcom/features/di/containers/UserFeatureRepository";
import { expect, it, vi } from "vitest";
import { checkIfUserHasFeatureController } from "./check-if-user-has-feature.controller";

vi.mock("@calcom/features/di/containers/UserFeatureRepository", () => ({
  getUserFeatureRepository: vi.fn(),
}));

/**
 * Since our current controller doesn't run any authentication checks or input validation,
 * this test is identical to the test in the use case.
 */
it("checks if user has access to feature", async () => {
  const mockUserFeatureRepository = {
    checkIfUserHasFeature: vi.fn(),
  };
  vi.mocked(getUserFeatureRepository).mockReturnValue(mockUserFeatureRepository as any);

  mockUserFeatureRepository.checkIfUserHasFeature.mockResolvedValueOnce(false);
  mockUserFeatureRepository.checkIfUserHasFeature.mockResolvedValueOnce(true);

  const userId = 1;
  await expect(checkIfUserHasFeatureController(userId, "nonexistent-feature")).resolves.toBe(false);
  await expect(checkIfUserHasFeatureController(userId, "mock-feature")).resolves.toBe(true);

  expect(mockUserFeatureRepository.checkIfUserHasFeature).toHaveBeenCalledWith(userId, "nonexistent-feature");
  expect(mockUserFeatureRepository.checkIfUserHasFeature).toHaveBeenCalledWith(userId, "mock-feature");
});
