import prismock from "@calcom/testing/lib/__mocks__/prisma";
import type { FeatureId } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { expect, it } from "vitest";
import { checkIfUserHasFeatureController } from "./check-if-user-has-feature.controller";

/**
 * Since our current controller doesn't run any authentication checks or input validation,
 * this test is identical to the test in the use case.
 */
it("checks if user has access to feature", async () => {
  const featuresRepository = new FeaturesRepository(prismock);
  const userId = 1;
  await featuresRepository.setUserFeatureState({
    userId,
    featureId: "mock-feature" as FeatureId,
    state: "enabled",
    assignedBy: "1",
  });
  await expect(checkIfUserHasFeatureController(userId, "nonexistent-feature")).resolves.toBe(false);
  await expect(checkIfUserHasFeatureController(userId, "mock-feature")).resolves.toBe(true);
});
