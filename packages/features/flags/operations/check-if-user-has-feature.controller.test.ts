import prismock from "../../../../tests/libs/__mocks__/prisma";

import { expect, it } from "vitest";

import { checkIfUserHasFeatureController } from "./check-if-user-has-feature.controller";

/**
 * Since our current controller doesn't run any authentication checks or input validation,
 * this test is identical to the test in the use case.
 */
it("checks if user has access to feature", async () => {
  const userId = 1;
  await prismock.userFeatures.create({
    data: {
      userId,
      featureId: "mock-feature",
      assignedBy: "1",
      updatedAt: new Date(),
      enabled: true,
    },
  });
  await expect(checkIfUserHasFeatureController(userId, "nonexistent-feature")).resolves.toBe(false);
  await expect(checkIfUserHasFeatureController(userId, "mock-feature")).resolves.toBe(true);
});
