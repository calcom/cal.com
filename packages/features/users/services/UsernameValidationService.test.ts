import { beforeEach, describe, expect, test, vi } from "vitest";
import { UsernameValidationService } from "./UsernameValidationService";

vi.stubEnv("NEXT_PUBLIC_IS_PREMIUM_NEW_PLAN", undefined);
vi.stubEnv("USERNAME_BLACKLIST_URL", undefined);

function createMockRepository() {
  return {
    findByUsernameAndOrg: vi.fn().mockResolvedValue(null),
    findSimilarUsernames: vi.fn().mockResolvedValue([]),
    isMigrationRedirectReserved: vi.fn().mockResolvedValue(false),
  };
}

describe("UsernameValidationService", () => {
  let service: UsernameValidationService;
  let mockRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockRepository();
    service = new UsernameValidationService(mockRepo as any);
  });

  describe("validateAvailability", () => {
    test("returns available when username does not exist in global namespace", async () => {
      mockRepo.findByUsernameAndOrg.mockResolvedValue(null);

      const result = await service.validateAvailability({
        username: "newuser",
        organizationId: null,
      });

      expect(result.available).toBe(true);
      expect(mockRepo.findByUsernameAndOrg).toHaveBeenCalledWith("newuser", null, undefined);
    });

    test("returns unavailable when username already exists", async () => {
      mockRepo.findByUsernameAndOrg.mockResolvedValue({ id: 1 });
      mockRepo.findSimilarUsernames.mockResolvedValue(["taken"]);

      const result = await service.validateAvailability({
        username: "taken",
        organizationId: null,
      });

      expect(result.available).toBe(false);
      expect(result.suggestion).toBeDefined();
    });

    test("returns available in org scope even if username exists globally", async () => {
      mockRepo.findByUsernameAndOrg.mockResolvedValue(null);

      const result = await service.validateAvailability({
        username: "globaluser",
        organizationId: 42,
      });

      expect(result.available).toBe(true);
      expect(mockRepo.findByUsernameAndOrg).toHaveBeenCalledWith("globaluser", 42, undefined);
    });

    test("excludes currentUserEmail when checking availability", async () => {
      mockRepo.findByUsernameAndOrg.mockResolvedValue(null);

      await service.validateAvailability({
        username: "myname",
        organizationId: null,
        currentUserEmail: "me@example.com",
      });

      expect(mockRepo.findByUsernameAndOrg).toHaveBeenCalledWith("myname", null, "me@example.com");
    });

    test("returns unavailable when username is reserved due to migration", async () => {
      mockRepo.findByUsernameAndOrg.mockResolvedValue(null);
      mockRepo.isMigrationRedirectReserved.mockResolvedValue(true);

      const result = await service.validateAvailability({
        username: "reserved",
        organizationId: null,
      });

      expect(result.available).toBe(false);
    });

    test("skips migration reservation check in org scope", async () => {
      mockRepo.findByUsernameAndOrg.mockResolvedValue(null);

      const result = await service.validateAvailability({
        username: "reserved",
        organizationId: 10,
      });

      expect(result.available).toBe(true);
      expect(mockRepo.isMigrationRedirectReserved).not.toHaveBeenCalled();
    });

    test("slugifies the username before checking", async () => {
      mockRepo.findByUsernameAndOrg.mockResolvedValue(null);

      await service.validateAvailability({
        username: "My User Name",
        organizationId: null,
      });

      expect(mockRepo.findByUsernameAndOrg).toHaveBeenCalledWith("my-user-name", null, undefined);
    });
  });

  describe("isReservedDueToMigration", () => {
    test("returns true when TempOrgRedirect exists", async () => {
      mockRepo.isMigrationRedirectReserved.mockResolvedValue(true);

      const result = await service.isReservedDueToMigration("olduser");

      expect(result).toBe(true);
      expect(mockRepo.isMigrationRedirectReserved).toHaveBeenCalledWith("olduser");
    });

    test("returns false when no TempOrgRedirect exists", async () => {
      mockRepo.isMigrationRedirectReserved.mockResolvedValue(false);

      const result = await service.isReservedDueToMigration("newuser");

      expect(result).toBe(false);
    });
  });

  describe("deriveFromEmail", () => {
    test("uses email user part when domain matches orgAutoAcceptEmail", () => {
      const result = service.deriveFromEmail("john.doe@acme.com", "acme.com");
      expect(result).toBe("john.doe");
    });

    test("includes domain name when domain does not match", () => {
      const result = service.deriveFromEmail("john@external.com", "acme.com");
      expect(result).toBe("john-external");
    });
  });

  describe("generateSuggestion", () => {
    test("returns username with numeric suffix", async () => {
      mockRepo.findSimilarUsernames.mockResolvedValue(["john"]);

      const result = await service.generateSuggestion("john", null);

      expect(result).toMatch(/^john\d+$/);
    });

    test("avoids existing usernames", async () => {
      mockRepo.findSimilarUsernames.mockResolvedValue(["john", "john001"]);

      const result = await service.generateSuggestion("john", null);

      expect(result).not.toBe("john001");
      expect(result).toMatch(/^john\d+$/);
    });
  });
});
