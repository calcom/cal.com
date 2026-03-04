import { ErrorCode } from "@calcom/lib/errorCodes";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HashedLinkRepository } from "../repository/HashedLinkRepository";
import { HashedLinkService } from "./HashedLinkService";

type MockRepository = {
  [K in keyof Omit<HashedLinkRepository, "prismaClient">]: ReturnType<typeof vi.fn>;
};

function createMockRepository(): MockRepository {
  return {
    deleteLinks: vi.fn(),
    createLink: vi.fn(),
    updateLink: vi.fn(),
    findLinksByEventTypeId: vi.fn(),
    findLinkWithEventTypeDetails: vi.fn(),
    findLinkWithDetails: vi.fn(),
    findLinksWithEventTypeDetails: vi.fn(),
    findLinkWithValidationData: vi.fn(),
    incrementUsage: vi.fn(),
  };
}

function createMockMembershipService() {
  return {
    checkMembership: vi.fn(),
  };
}

function createService(
  mockRepository: MockRepository,
  mockMembershipService: ReturnType<typeof createMockMembershipService>
) {
  return new HashedLinkService({
    hashedLinkRepository: mockRepository as unknown as HashedLinkRepository,
    membershipService: mockMembershipService as unknown as ConstructorParameters<
      typeof HashedLinkService
    >[0] extends { membershipService: infer M }
      ? M
      : never,
  });
}

describe("HashedLinkService", () => {
  let mockRepository: MockRepository;
  let mockMembershipService: ReturnType<typeof createMockMembershipService>;
  let service: HashedLinkService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = createMockRepository();
    mockMembershipService = createMockMembershipService();
    service = createService(mockRepository, mockMembershipService);
  });

  describe("handleMultiplePrivateLinks", () => {
    // Scenario 1: Invalid eventTypeId (0)
    it("throws when eventTypeId is 0", async () => {
      await expect(
        service.handleMultiplePrivateLinks({
          eventTypeId: 0,
          multiplePrivateLinks: ["abc"],
          connectedMultiplePrivateLinks: [],
        })
      ).rejects.toThrow("Invalid event type ID");
    });

    // Scenario 2: Invalid eventTypeId (negative)
    it("throws when eventTypeId is negative", async () => {
      await expect(
        service.handleMultiplePrivateLinks({
          eventTypeId: -1,
          multiplePrivateLinks: ["abc"],
          connectedMultiplePrivateLinks: [],
        })
      ).rejects.toThrow("Invalid event type ID");
    });

    // Scenario 3: Empty multiplePrivateLinks array
    it("deletes all connected links when multiplePrivateLinks is empty", async () => {
      await service.handleMultiplePrivateLinks({
        eventTypeId: 1,
        multiplePrivateLinks: [],
        connectedMultiplePrivateLinks: ["existing-link-1", "existing-link-2"],
      });

      expect(mockRepository.deleteLinks).toHaveBeenCalledWith(1, ["existing-link-1", "existing-link-2"]);
      expect(mockRepository.createLink).not.toHaveBeenCalled();
      expect(mockRepository.updateLink).not.toHaveBeenCalled();
    });

    // Scenario 4: Undefined multiplePrivateLinks
    it("deletes all connected links when multiplePrivateLinks is undefined", async () => {
      await service.handleMultiplePrivateLinks({
        eventTypeId: 1,
        multiplePrivateLinks: undefined,
        connectedMultiplePrivateLinks: ["existing-link"],
      });

      expect(mockRepository.deleteLinks).toHaveBeenCalledWith(1, ["existing-link"]);
      expect(mockRepository.createLink).not.toHaveBeenCalled();
    });

    // Scenario 5: All new links (no existing)
    it("creates all links when none exist", async () => {
      await service.handleMultiplePrivateLinks({
        eventTypeId: 1,
        multiplePrivateLinks: ["abc", "def"],
        connectedMultiplePrivateLinks: [],
      });

      expect(mockRepository.deleteLinks).toHaveBeenCalledWith(1, []);
      expect(mockRepository.createLink).toHaveBeenCalledTimes(2);
      expect(mockRepository.createLink).toHaveBeenCalledWith(1, { link: "abc", expiresAt: null });
      expect(mockRepository.createLink).toHaveBeenCalledWith(1, { link: "def", expiresAt: null });
      expect(mockRepository.updateLink).not.toHaveBeenCalled();
    });

    // Scenario 6: All existing links (no changes)
    it("updates existing links without creating or deleting", async () => {
      await service.handleMultiplePrivateLinks({
        eventTypeId: 1,
        multiplePrivateLinks: ["abc"],
        connectedMultiplePrivateLinks: ["abc"],
      });

      expect(mockRepository.deleteLinks).toHaveBeenCalledWith(1, []);
      expect(mockRepository.updateLink).toHaveBeenCalledWith(1, { link: "abc", expiresAt: null });
      expect(mockRepository.createLink).not.toHaveBeenCalled();
    });

    // Scenario 7: Mix: some new, some existing, some removed
    it("handles mix of new, existing, and removed links", async () => {
      await service.handleMultiplePrivateLinks({
        eventTypeId: 1,
        multiplePrivateLinks: ["abc", "new-link"],
        connectedMultiplePrivateLinks: ["abc", "old-link"],
      });

      expect(mockRepository.deleteLinks).toHaveBeenCalledWith(1, ["old-link"]);
      expect(mockRepository.updateLink).toHaveBeenCalledWith(1, { link: "abc", expiresAt: null });
      expect(mockRepository.createLink).toHaveBeenCalledWith(1, { link: "new-link", expiresAt: null });
    });

    // Scenario 8: String input normalization
    it("normalizes string input to object with null expiresAt", async () => {
      await service.handleMultiplePrivateLinks({
        eventTypeId: 1,
        multiplePrivateLinks: ["abc"],
        connectedMultiplePrivateLinks: [],
      });

      expect(mockRepository.createLink).toHaveBeenCalledWith(1, { link: "abc", expiresAt: null });
    });

    // Scenario 9: Object input with expiration
    it("passes expiresAt and maxUsageCount from object input", async () => {
      const futureDate = new Date("2099-01-01T00:00:00Z");
      await service.handleMultiplePrivateLinks({
        eventTypeId: 1,
        multiplePrivateLinks: [{ link: "abc", expiresAt: futureDate, maxUsageCount: 5 }],
        connectedMultiplePrivateLinks: [],
      });

      expect(mockRepository.createLink).toHaveBeenCalledWith(1, {
        link: "abc",
        expiresAt: futureDate,
        maxUsageCount: 5,
      });
    });

    // Scenario 10: Object input with null expiresAt
    it("defaults expiresAt to null when not provided in object input", async () => {
      await service.handleMultiplePrivateLinks({
        eventTypeId: 1,
        multiplePrivateLinks: [{ link: "abc" }],
        connectedMultiplePrivateLinks: [],
      });

      expect(mockRepository.createLink).toHaveBeenCalledWith(1, { link: "abc", expiresAt: null });
    });
  });

  describe("validate", () => {
    // Scenario 11: Valid link, not expired
    it("returns link data when link is valid", async () => {
      const validLink = {
        id: 1,
        expiresAt: new Date("2099-01-01T00:00:00Z"),
        maxUsageCount: 10,
        usageCount: 3,
        eventType: {
          userId: 1,
          teamId: null,
          hosts: [],
          profile: null,
          owner: { timeZone: "UTC" },
        },
      };
      mockRepository.findLinkWithValidationData.mockResolvedValue(validLink);

      const result = await service.validate("valid-link");

      expect(result).toBe(validLink);
      expect(mockRepository.findLinkWithValidationData).toHaveBeenCalledWith("valid-link");
    });

    // Scenario 12: Link not found
    it("throws PrivateLinkExpired when link is not found", async () => {
      mockRepository.findLinkWithValidationData.mockResolvedValue(null);

      await expect(service.validate("nonexistent-link")).rejects.toThrow(ErrorCode.PrivateLinkExpired);
    });

    // Scenario 13: Invalid linkId (empty string)
    it("throws when linkId is empty string", async () => {
      await expect(service.validate("")).rejects.toThrow("Invalid link ID");
    });

    // Scenario 14: Invalid linkId (non-string)
    it("throws when linkId is null", async () => {
      await expect(service.validate(null as unknown as string)).rejects.toThrow("Invalid link ID");
    });
  });

  describe("validateAndIncrementUsage", () => {
    function createValidLink(overrides: Record<string, unknown> = {}) {
      return {
        id: 1,
        expiresAt: null,
        maxUsageCount: null,
        usageCount: 0,
        eventType: {
          userId: 1,
          teamId: null,
          hosts: [],
          profile: null,
          owner: { timeZone: "UTC" },
        },
        ...overrides,
      };
    }

    // Scenario 15: Time-based link (has expiresAt)
    it("returns link without incrementing usage for time-based link", async () => {
      const link = createValidLink({ expiresAt: new Date("2099-01-01T00:00:00Z") });
      mockRepository.findLinkWithValidationData.mockResolvedValue(link);

      const result = await service.validateAndIncrementUsage("time-link");

      expect(result).toBe(link);
      expect(mockRepository.incrementUsage).not.toHaveBeenCalled();
    });

    // Scenario 16: Usage-based link, under limit
    it("increments usage for usage-based link under limit", async () => {
      const link = createValidLink({ maxUsageCount: 5, usageCount: 2 });
      mockRepository.findLinkWithValidationData.mockResolvedValue(link);

      const result = await service.validateAndIncrementUsage("usage-link");

      expect(result).toBe(link);
      expect(mockRepository.incrementUsage).toHaveBeenCalledWith(1, 5);
    });

    // Scenario 17: Usage-based link, increment fails (race condition)
    it("throws PrivateLinkExpired when increment fails", async () => {
      const link = createValidLink({ maxUsageCount: 5, usageCount: 4 });
      mockRepository.findLinkWithValidationData.mockResolvedValue(link);
      mockRepository.incrementUsage.mockRejectedValue(new Error("P2025"));

      await expect(service.validateAndIncrementUsage("usage-link")).rejects.toThrow(
        ErrorCode.PrivateLinkExpired
      );
    });

    // Scenario 18: No expiration constraints
    it("returns link without incrementing when maxUsageCount is null", async () => {
      const link = createValidLink({ maxUsageCount: null, expiresAt: null });
      mockRepository.findLinkWithValidationData.mockResolvedValue(link);

      const result = await service.validateAndIncrementUsage("no-expiry-link");

      expect(result).toBe(link);
      expect(mockRepository.incrementUsage).not.toHaveBeenCalled();
    });

    // Scenario 19: maxUsageCount is 0
    it("returns link without incrementing when maxUsageCount is 0", async () => {
      const link = createValidLink({ maxUsageCount: 0 });
      mockRepository.findLinkWithValidationData.mockResolvedValue(link);

      const result = await service.validateAndIncrementUsage("zero-max-link");

      expect(result).toBe(link);
      expect(mockRepository.incrementUsage).not.toHaveBeenCalled();
    });
  });

  describe("checkUserPermissionForLink", () => {
    // Scenario 20: User owns the event type
    it("returns true when user owns the event type", async () => {
      const link = { eventType: { userId: 42, teamId: null } };

      const result = await service.checkUserPermissionForLink(link, 42);

      expect(result).toBe(true);
    });

    // Scenario 21: User does NOT own the event type
    it("returns false when user does not own the event type", async () => {
      const link = { eventType: { userId: 42, teamId: null } };

      const result = await service.checkUserPermissionForLink(link, 99);

      expect(result).toBe(false);
    });

    // Scenario 22: Team event type, user is team member
    it("returns true when user is a team member", async () => {
      const link = { eventType: { userId: null, teamId: 10 } };
      mockMembershipService.checkMembership.mockResolvedValue({ isMember: true });

      const result = await service.checkUserPermissionForLink(link, 42);

      expect(result).toBe(true);
      expect(mockMembershipService.checkMembership).toHaveBeenCalledWith(10, 42);
    });

    // Scenario 23: Team event type, user is NOT member
    it("returns false when user is not a team member", async () => {
      const link = { eventType: { userId: null, teamId: 10 } };
      mockMembershipService.checkMembership.mockResolvedValue({ isMember: false });

      const result = await service.checkUserPermissionForLink(link, 42);

      expect(result).toBe(false);
    });

    // Scenario 24: No userId and no teamId
    it("returns false when no userId and no teamId on event type", async () => {
      const link = { eventType: { userId: null, teamId: null } };

      const result = await service.checkUserPermissionForLink(link, 42);

      expect(result).toBe(false);
    });

    // Scenario 25: Invalid userId (0)
    it("returns false when userId is 0", async () => {
      const link = { eventType: { userId: 42, teamId: null } };

      const result = await service.checkUserPermissionForLink(link, 0);

      expect(result).toBe(false);
    });

    // Scenario 26: Null eventType
    it("returns false when eventType is null", async () => {
      const link = { eventType: null as unknown as { teamId: number | null; userId: number | null } };

      const result = await service.checkUserPermissionForLink(link, 42);

      expect(result).toBe(false);
    });
  });

  describe("findLinkWithDetails", () => {
    // Scenario 27: Link found
    it("returns the link when found", async () => {
      const linkData = { id: 1, link: "abc", eventTypeId: 1 };
      mockRepository.findLinkWithDetails.mockResolvedValue(linkData);

      const result = await service.findLinkWithDetails("abc");

      expect(result).toBe(linkData);
    });

    // Scenario 28: Link not found
    it("returns null when link is not found", async () => {
      mockRepository.findLinkWithDetails.mockResolvedValue(null);

      const result = await service.findLinkWithDetails("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("createLinkForEventType", () => {
    // Scenario 29: String input
    it("normalizes string input and delegates to repository", async () => {
      await service.createLinkForEventType(1, "abc");

      expect(mockRepository.createLink).toHaveBeenCalledWith(1, { link: "abc", expiresAt: null });
    });

    // Scenario 30: Object input
    it("normalizes object input and delegates to repository", async () => {
      const expiresAt = new Date("2099-01-01T00:00:00Z");
      await service.createLinkForEventType(1, { link: "abc", expiresAt });

      expect(mockRepository.createLink).toHaveBeenCalledWith(1, { link: "abc", expiresAt });
    });
  });

  describe("deleteLinkForEventType", () => {
    // Scenario 31: Delegates to repository with single-element array
    it("delegates to repository deleteLinks with single-element array", async () => {
      await service.deleteLinkForEventType(1, "abc");

      expect(mockRepository.deleteLinks).toHaveBeenCalledWith(1, ["abc"]);
    });
  });
});
