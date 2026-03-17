import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaHolidayRepository } from "./PrismaHolidayRepository";

describe("PrismaHolidayRepository Integration Tests", () => {
  let testUser: User;
  const repo = new PrismaHolidayRepository(prisma);

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `prisma-holiday-repo-test-${Date.now()}@example.com`,
        username: `prisma-holiday-repo-test-${Date.now()}`,
      },
    });

    await prisma.userHolidaySettings.create({
      data: {
        userId: testUser.id,
        countryCode: "US",
        disabledIds: ["holiday_1"],
      },
    });
  });

  afterAll(async () => {
    await prisma.userHolidaySettings.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
  });

  describe("findUserSettingsSelect", () => {
    it("should return selected fields for an existing user", async () => {
      const result = await repo.findUserSettingsSelect({
        userId: testUser.id,
        select: { countryCode: true, disabledIds: true },
      });

      expect(result).toBeDefined();
      expect(result!.countryCode).toBe("US");
      expect(result!.disabledIds).toEqual(["holiday_1"]);
    });

    it("should return null when user has no holiday settings", async () => {
      const result = await repo.findUserSettingsSelect({
        userId: 999999,
        select: { countryCode: true },
      });

      expect(result).toBeNull();
    });

    it("should respect the select parameter", async () => {
      const result = await repo.findUserSettingsSelect({
        userId: testUser.id,
        select: { countryCode: true },
      });

      expect(result).toBeDefined();
      expect(result!.countryCode).toBe("US");
      // disabledIds not selected, so should not be present
      expect(result).not.toHaveProperty("disabledIds");
    });
  });
});
