import "reflect-metadata";
import { afterEach, beforeEach, expect, it } from "vitest";

import { destroyContainer, initializeContainer } from "@calcom/di";

import { checkIfUserHasFeatureUseCase } from "./check-if-user-has-feature.use-case";

beforeEach(() => {
  initializeContainer();
});

afterEach(() => {
  destroyContainer();
});

// A great guide on test names
// https://www.epicweb.dev/talks/how-to-write-better-test-names
// This is identical to the test in the controller since the controller currently
// doens't run any authentication checks or input validation.
it("returns if user has access to feature", async () => {
  const userId = 1;
  await expect(checkIfUserHasFeatureUseCase(userId, "nonexistent-feature")).resolves.toBe(false);
  await expect(checkIfUserHasFeatureUseCase(userId, "mock-feature")).resolves.toBe(true);
});
