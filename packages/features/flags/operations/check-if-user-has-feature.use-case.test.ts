import prismock from "../../../../tests/libs/__mocks__/prisma";

import { expect, it } from "vitest";

import { checkIfUserHasFeatureUseCase } from "./check-if-user-has-feature.use-case";

// This is identical to the test in the controller since the controller currently
// doesn't run any authentication checks or input validation.
it("returns if user has access to feature", async () => {
  const userId = 1;
  await prismock.userFeatures.create({
    data: {
      userId,
      featureId: "mock-feature",
      assignedBy: "1",
      updatedAt: new Date(),
    },
  });
  await expect(checkIfUserHasFeatureUseCase(userId, "nonexistent-feature")).resolves.toBe(false);
  await expect(checkIfUserHasFeatureUseCase(userId, "mock-feature")).resolves.toBe(true);
});
