import prismock from "@calcom/testing/lib/__mocks__/prisma";

import { expect, it } from "vitest";

import type { FeatureId } from "@calcom/features/flags/config";
import { UserFeatureRepository } from "@calcom/features/flags/repositories/UserFeatureRepository";

import { checkIfUserHasFeatureUseCase } from "./check-if-user-has-feature.use-case";

// This is identical to the test in the controller since the controller currently
// doesn't run any authentication checks or input validation.
it("returns if user has access to feature", async () => {
  const userFeatureRepository = new UserFeatureRepository(prismock);
  const userId = 1;
  await userFeatureRepository.setState({
    userId,
    featureId: "mock-feature" as FeatureId,
    state: "enabled",
    assignedBy: "1",
  });
  await expect(checkIfUserHasFeatureUseCase(userId, "nonexistent-feature")).resolves.toBe(false);
  await expect(checkIfUserHasFeatureUseCase(userId, "mock-feature")).resolves.toBe(true);
});
