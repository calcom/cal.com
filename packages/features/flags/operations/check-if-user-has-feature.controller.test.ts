import prismock from "@calcom/testing/lib/__mocks__/prisma";
import type { FeatureId } from "@calcom/features/flags/config";
import { PrismaUserFeatureRepository } from "@calcom/features/flags/repositories/PrismaUserFeatureRepository";
import type { PrismaClient } from "@calcom/prisma/client";
import { expect, it, vi } from "vitest";
import { checkIfUserHasFeatureController } from "./check-if-user-has-feature.controller";

const userFeatureRepository = new PrismaUserFeatureRepository(prismock as unknown as PrismaClient);

vi.mock("@calcom/features/di/containers/UserFeatureRepository", () => ({
  getUserFeatureRepository: () => userFeatureRepository,
}));

/**
 * Since our current controller doesn't run any authentication checks or input validation,
 * this test is identical to the test in the use case.
 */
it("checks if user has access to feature", async () => {
  const userId = 1;
  await userFeatureRepository.upsert(userId, "mock-feature" as FeatureId, true, "1");
  await expect(checkIfUserHasFeatureController(userId, "nonexistent-feature")).resolves.toBe(false);
  await expect(checkIfUserHasFeatureController(userId, "mock-feature")).resolves.toBe(true);
});
