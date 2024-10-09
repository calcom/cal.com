import "reflect-metadata";
import { afterEach, beforeEach, expect, it } from "vitest";

import { MockFeaturesRepository } from "@calcom/features/flags/features.repository.mock";

import { destroyContainer, getInjection, initializeContainer } from ".";

beforeEach(() => {
  initializeContainer();
});

afterEach(() => {
  destroyContainer();
});

it("should use Mock versions of repos and services", async () => {
  const featuresRepository = getInjection("FeaturesRepository");
  expect(featuresRepository).toBeInstanceOf(MockFeaturesRepository);
});
