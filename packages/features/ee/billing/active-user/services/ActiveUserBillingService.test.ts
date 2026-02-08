import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActiveUserBillingRepository } from "../repositories/ActiveUserBillingRepository";
import { ActiveUserBillingService } from "./ActiveUserBillingService";

function createMockRepository(): {
  [K in keyof ActiveUserBillingRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    getManagedUserEmailsBySubscriptionId: vi.fn().mockResolvedValue([]),
    getOrgMemberEmailsByOrgId: vi.fn().mockResolvedValue([]),
    getActivePlatformUsersAsHost: vi.fn().mockResolvedValue([]),
    getActiveUsersAsHost: vi.fn().mockResolvedValue([]),
    getActiveUsersAsAttendee: vi.fn().mockResolvedValue([]),
  };
}

describe("ActiveUserBillingService", () => {
  let service: ActiveUserBillingService;
  let mockRepo: ReturnType<typeof createMockRepository>;

  const periodStart = new Date("2026-01-01T00:00:00Z");
  const periodEnd = new Date("2026-02-01T00:00:00Z");

  beforeEach(() => {
    mockRepo = createMockRepository();
    service = new ActiveUserBillingService({
      activeUserBillingRepository: mockRepo as unknown as ActiveUserBillingRepository,
    });
  });

  describe("getActiveUserCountForPlatformOrg", () => {
    const subscriptionId = "sub_abc123";

    it("returns 0 when there are no managed users", async () => {
      mockRepo.getManagedUserEmailsBySubscriptionId.mockResolvedValue([]);

      const count = await service.getActiveUserCountForPlatformOrg(subscriptionId, periodStart, periodEnd);

      expect(count).toBe(0);
      expect(mockRepo.getManagedUserEmailsBySubscriptionId).toHaveBeenCalledWith(subscriptionId);
      expect(mockRepo.getActivePlatformUsersAsHost).not.toHaveBeenCalled();
      expect(mockRepo.getActiveUsersAsAttendee).not.toHaveBeenCalled();
    });

    it("counts users who were active as hosts only", async () => {
      mockRepo.getManagedUserEmailsBySubscriptionId.mockResolvedValue([
        { email: "alice@test.com" },
        { email: "bob@test.com" },
        { email: "charlie@test.com" },
      ]);
      mockRepo.getActivePlatformUsersAsHost.mockResolvedValue([
        { email: "alice@test.com" },
        { email: "bob@test.com" },
      ]);
      mockRepo.getActiveUsersAsAttendee.mockResolvedValue([]);

      const count = await service.getActiveUserCountForPlatformOrg(subscriptionId, periodStart, periodEnd);

      expect(count).toBe(2);
      expect(mockRepo.getActivePlatformUsersAsHost).toHaveBeenCalledWith(
        subscriptionId,
        periodStart,
        periodEnd
      );
      expect(mockRepo.getActiveUsersAsAttendee).toHaveBeenCalledWith(
        ["charlie@test.com"],
        periodStart,
        periodEnd
      );
    });

    it("counts users who were active as attendees only", async () => {
      mockRepo.getManagedUserEmailsBySubscriptionId.mockResolvedValue([
        { email: "alice@test.com" },
        { email: "bob@test.com" },
      ]);
      mockRepo.getActivePlatformUsersAsHost.mockResolvedValue([]);
      mockRepo.getActiveUsersAsAttendee.mockResolvedValue([{ email: "alice@test.com" }]);

      const count = await service.getActiveUserCountForPlatformOrg(subscriptionId, periodStart, periodEnd);

      expect(count).toBe(1);
    });

    it("counts combined hosts and attendees without double-counting", async () => {
      mockRepo.getManagedUserEmailsBySubscriptionId.mockResolvedValue([
        { email: "alice@test.com" },
        { email: "bob@test.com" },
        { email: "charlie@test.com" },
      ]);
      mockRepo.getActivePlatformUsersAsHost.mockResolvedValue([{ email: "alice@test.com" }]);
      mockRepo.getActiveUsersAsAttendee.mockResolvedValue([{ email: "bob@test.com" }]);

      const count = await service.getActiveUserCountForPlatformOrg(subscriptionId, periodStart, periodEnd);

      expect(count).toBe(2);
      // Should only check non-host emails for attendee activity
      expect(mockRepo.getActiveUsersAsAttendee).toHaveBeenCalledWith(
        ["bob@test.com", "charlie@test.com"],
        periodStart,
        periodEnd
      );
    });

    it("returns count of all users when everyone is a host", async () => {
      mockRepo.getManagedUserEmailsBySubscriptionId.mockResolvedValue([
        { email: "alice@test.com" },
        { email: "bob@test.com" },
      ]);
      mockRepo.getActivePlatformUsersAsHost.mockResolvedValue([
        { email: "alice@test.com" },
        { email: "bob@test.com" },
      ]);

      const count = await service.getActiveUserCountForPlatformOrg(subscriptionId, periodStart, periodEnd);

      expect(count).toBe(2);
      // Should skip attendee check when all users are already hosts
      expect(mockRepo.getActiveUsersAsAttendee).not.toHaveBeenCalled();
    });

    it("returns 0 when no users are active", async () => {
      mockRepo.getManagedUserEmailsBySubscriptionId.mockResolvedValue([
        { email: "alice@test.com" },
        { email: "bob@test.com" },
      ]);
      mockRepo.getActivePlatformUsersAsHost.mockResolvedValue([]);
      mockRepo.getActiveUsersAsAttendee.mockResolvedValue([]);

      const count = await service.getActiveUserCountForPlatformOrg(subscriptionId, periodStart, periodEnd);

      expect(count).toBe(0);
    });
  });

  describe("getActiveUserCountForOrg", () => {
    const orgId = 42;

    it("returns 0 when org has no members", async () => {
      mockRepo.getOrgMemberEmailsByOrgId.mockResolvedValue([]);

      const count = await service.getActiveUserCountForOrg(orgId, periodStart, periodEnd);

      expect(count).toBe(0);
      expect(mockRepo.getOrgMemberEmailsByOrgId).toHaveBeenCalledWith(orgId);
      expect(mockRepo.getActiveUsersAsHost).not.toHaveBeenCalled();
    });

    it("counts org members who were active as hosts", async () => {
      mockRepo.getOrgMemberEmailsByOrgId.mockResolvedValue([
        { email: "member1@org.com" },
        { email: "member2@org.com" },
      ]);
      mockRepo.getActiveUsersAsHost.mockResolvedValue([{ email: "member1@org.com" }]);
      mockRepo.getActiveUsersAsAttendee.mockResolvedValue([]);

      const count = await service.getActiveUserCountForOrg(orgId, periodStart, periodEnd);

      expect(count).toBe(1);
      expect(mockRepo.getActiveUsersAsHost).toHaveBeenCalledWith(
        ["member1@org.com", "member2@org.com"],
        periodStart,
        periodEnd
      );
    });

    it("counts org members who were active as attendees", async () => {
      mockRepo.getOrgMemberEmailsByOrgId.mockResolvedValue([
        { email: "member1@org.com" },
        { email: "member2@org.com" },
        { email: "member3@org.com" },
      ]);
      mockRepo.getActiveUsersAsHost.mockResolvedValue([{ email: "member1@org.com" }]);
      mockRepo.getActiveUsersAsAttendee.mockResolvedValue([{ email: "member2@org.com" }]);

      const count = await service.getActiveUserCountForOrg(orgId, periodStart, periodEnd);

      expect(count).toBe(2);
    });

    it("handles large org with many members efficiently", async () => {
      const emails = Array.from({ length: 100 }, (_, i) => ({ email: `user${i}@org.com` }));
      mockRepo.getOrgMemberEmailsByOrgId.mockResolvedValue(emails);

      const hostEmails = emails.slice(0, 30);
      mockRepo.getActiveUsersAsHost.mockResolvedValue(hostEmails);

      const attendeeEmails = emails.slice(30, 50).map((e) => ({ email: e.email }));
      mockRepo.getActiveUsersAsAttendee.mockResolvedValue(attendeeEmails);

      const count = await service.getActiveUserCountForOrg(orgId, periodStart, periodEnd);

      expect(count).toBe(50);
      // Attendee check should only receive the 70 non-host emails
      expect(mockRepo.getActiveUsersAsAttendee).toHaveBeenCalledWith(
        emails.slice(30).map((e) => e.email),
        periodStart,
        periodEnd
      );
    });
  });
});
