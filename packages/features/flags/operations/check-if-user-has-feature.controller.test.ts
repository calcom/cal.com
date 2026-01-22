import prismock from "@calcom/testing/lib/__mocks__/prisma";

import { expect, it } from "vitest";

import type { FeatureId } from "@calcom/features/flags/config";
import { UserFeatureRepository } from "@calcom/features/flags/repositories/UserFeatureRepository";

import { checkIfUserHasFeatureController } from "./check-if-user-has-feature.controller";

/**
 * Since our current controller doesn't run any authentication checks or input validation,
 * this test is identical to the test in the use case.
 */
it("checks if user has access to feature", async () => {
  const userFeatureRepository = new UserFeatureRepository(prismock);
  const userId = 1;
  await userFeatureRepository.setState({
    userId,
    featureId: "mock-feature" as FeatureId,
    state: "enabled",
    assignedBy: "1",
  });
  await expect(checkIfUserHasFeatureController(userId, "nonexistent-feature")).resolves.toBe(false);
  await expect(checkIfUserHasFeatureController(userId, "mock-feature")).resolves.toBe(true);
});
