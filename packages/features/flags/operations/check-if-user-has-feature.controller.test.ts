import "reflect-metadata";
import { afterEach, beforeEach, expect, it } from "vitest";

import { destroyContainer, initializeContainer } from "@calcom/di";

import { checkIfUserHasFeatureController } from "./check-if-user-has-feature.controller";

beforeEach(() => {
  initializeContainer();
});

afterEach(() => {
  destroyContainer();
});

// A great guide on test names
// https://www.epicweb.dev/talks/how-to-write-better-test-names
/**
 * Since our current controller doesn't run any authentication checks or input validation,
 * this test is identical to the test in the use case.
 */
it("checks if user has access to feature", async () => {
  const userId = 1;
  await expect(checkIfUserHasFeatureController(userId, "nonexistent-feature")).resolves.toBe(false);
  await expect(checkIfUserHasFeatureController(userId, "mock-feature")).resolves.toBe(true);
});
