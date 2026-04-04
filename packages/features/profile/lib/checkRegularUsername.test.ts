import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/profile/repositories/ProfileRepository", () => ({
  ProfileRepository: {
    findManyByOrgSlugOrRequestedSlug: vi.fn(),
  },
}));

vi.mock("@calcom/lib/server/username", () => ({
  isUsernameReservedDueToMigration: vi.fn().mockResolvedValue(false),
}));

import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { isUsernameReservedDueToMigration } from "@calcom/lib/server/username";

import { checkRegularUsername } from "./checkRegularUsername";

describe("checkRegularUsername", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normal usernames", () => {
    it("returns available for non-reserved slug in global namespace", async () => {
      const result = await checkRegularUsername("johndoe");

      expect(result.available).toBe(true);
    });

    it("returns unavailable when user exists in org context", async () => {
      vi.mocked(ProfileRepository.findManyByOrgSlugOrRequestedSlug).mockResolvedValue([
        { user: { id: 1, username: "johndoe" } },
      ] as any);

      const result = await checkRegularUsername("johndoe", "acme");

      expect(result.available).toBe(false);
      expect(result.message).toBe("A user exists with that username");
    });

    it("returns unavailable when username is reserved due to migration", async () => {
      vi.mocked(isUsernameReservedDueToMigration).mockResolvedValue(true);

      const result = await checkRegularUsername("migrateduser");

      expect(result.available).toBe(false);
    });
  });
});
