import prismock from "@calcom/testing/lib/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { createHandler } from "./create.handler";

vi.mock("@calcom/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
  return {
    ...actual,
    RESERVED_SUBDOMAINS: [],
    ORG_SELF_SERVE_ENABLED: true,
    ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE: 0,
  };
});

vi.mock("@calcom/lib/domainManager/organization", () => ({
  createDomain: vi.fn().mockResolvedValue(true),
}));

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

const createTestUser = async (overrides: { email: string; role?: UserPermissionRole }) => {
  return prismock.user.create({
    data: {
      email: overrides.email,
      username: overrides.email.split("@")[0],
      role: overrides.role ?? UserPermissionRole.USER,
      completedOnboarding: true,
      emailVerified: new Date(),
    },
  });
};

const createInput = (overrides: Partial<Parameters<typeof createHandler>[0]["input"]> = {}) => ({
  name: "Test Org",
  slug: "test-org",
  orgOwnerEmail: "owner@example.com",
  isPlatform: false,
  creationSource: "WEBAPP" as const,
  ...overrides,
});

describe("createHandler", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await prismock.reset();
  });

  describe("organization ownership authorization", () => {
    it.each([
      { orgOwnerEmail: "other@example.com" },
      { orgOwnerEmail: "other@example.com", isPlatform: true },
    ])("rejects non-admin creating org for another user (%o)", async (inputOverrides) => {
      const user = await createTestUser({ email: "user@example.com" });

      await expect(
        createHandler({
          input: createInput(inputOverrides),
          ctx: { user },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You can only create organization where you are the owner",
      });
    });

    it("allows admin to bypass owner email restriction", async () => {
      const admin = await createTestUser({ email: "admin@example.com", role: UserPermissionRole.ADMIN });
      await createTestUser({ email: "owner@example.com" });

      const adminWithProfile = {
        ...admin,
        profile: admin.profile ?? { organizationId: null },
      };

      const result = await createHandler({
        input: createInput({ orgOwnerEmail: "owner@example.com" }),
        ctx: { user: adminWithProfile },
      });

      expect(result.email).toBe("owner@example.com");
    });
  });
});
