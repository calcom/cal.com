import prismock from "@calcom/testing/lib/__mocks__/prisma";

import { expect, it } from "vitest";

import type { FeatureId } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";

import { checkIfUserHasFeatureUseCase } from "./check-if-user-has-feature.use-case";

// This is identical to the test in the controller since the controller currently
// doesn't run any authentication checks or input validation.
it("returns if user has access to feature", async () => {
  const featuresRepository = new FeaturesRepository(prismock);
  const userId = 1;
  await featuresRepository.setUserFeatureState({
    userId,
    featureId: "mock-feature" as FeatureId,
    state: "enabled",
    assignedBy: "1",
  });
  await expect(checkIfUserHasFeatureUseCase(userId, "nonexistent-feature")).resolves.toBe(false);
  await expect(checkIfUserHasFeatureUseCase(userId, "mock-feature")).resolves.toBe(true);
});
