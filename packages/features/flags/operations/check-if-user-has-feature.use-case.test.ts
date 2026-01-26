import prismock from "@calcom/testing/lib/__mocks__/prisma";
import type { FeatureId } from "@calcom/features/flags/config";
import { PrismaUserFeatureRepository } from "@calcom/features/flags/repositories/PrismaUserFeatureRepository";
import type { PrismaClient } from "@calcom/prisma/client";
import { expect, it, vi } from "vitest";
import { checkIfUserHasFeatureUseCase } from "./check-if-user-has-feature.use-case";

const userFeatureRepository = new PrismaUserFeatureRepository(prismock as unknown as PrismaClient);

vi.mock("@calcom/features/di/containers/UserFeatureRepository", () => ({
  getUserFeatureRepository: () => userFeatureRepository,
}));

// This is identical to the test in the controller since the controller currently
// doesn't run any authentication checks or input validation.
it("returns if user has access to feature", async () => {
  vi.clearAllMocks();
  const userId = 1;
  await userFeatureRepository.upsert(userId, "mock-feature" as FeatureId, true, "1");
  await expect(checkIfUserHasFeatureUseCase(userId, "nonexistent-feature")).resolves.toBe(false);
  await expect(checkIfUserHasFeatureUseCase(userId, "mock-feature")).resolves.toBe(true);
});
