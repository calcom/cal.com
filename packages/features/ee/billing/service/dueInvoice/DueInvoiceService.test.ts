import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DueInvoiceService } from "./DueInvoiceService";

const mockFindTeamMembersWithPermission = vi.fn();

vi.mock("../../../teams/repositories/TeamRepository", () => ({
  TeamRepository: class MockTeamRepository {
    findTeamMembersWithPermission = mockFindTeamMembersWithPermission;
  },
}));

function createProration({
  id,
  teamId,
  teamName,
  isOrganization = false,
  invoiceUrl = null,
  daysOld = 0,
}: {
  id: string;
  teamId: number;
  teamName: string;
  isOrganization?: boolean;
  invoiceUrl?: string | null;
  daysOld?: number;
}) {
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysOld);

  return {
    id,
    teamId,
    proratedAmount: 1000,
    createdAt,
    monthKey: "2026-03",
    invoiceUrl,
    status: "INVOICE_CREATED",
    team: {
      id: teamId,
      name: teamName,
      isOrganization,
    },
  };
}

describe("DueInvoiceService", () => {
  let service: DueInvoiceService;

  beforeEach(() => {
    mockFindTeamMembersWithPermission.mockReset();
    service = new DueInvoiceService(prismaMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getBannerDataForUser", () => {
    it("returns empty array when user has no memberships", async () => {
      prismaMock.membership.findMany.mockResolvedValue([]);

      const result = await service.getBannerDataForUser(1);

      expect(result).toEqual([]);
    });

    it("returns prorations for teams where user has billing permission", async () => {
      const userId = 1;
      const teamId = 10;

      prismaMock.membership.findMany
        .mockResolvedValueOnce([
          { teamId, team: { id: teamId, isOrganization: false } },
        ] as never)
        .mockResolvedValueOnce([{ teamId }] as never);

      mockFindTeamMembersWithPermission.mockResolvedValue([
        { id: userId, name: "User", email: "u@test.com", locale: null },
      ]);

      const proration = createProration({
        id: "pror-1",
        teamId,
        teamName: "Team A",
        invoiceUrl: "https://stripe.com/invoice/123",
      });

      prismaMock.monthlyProration.findMany.mockResolvedValueOnce([proration] as never);

      const result = await service.getBannerDataForUser(userId);

      expect(result).toHaveLength(1);
      expect(result[0].teamId).toBe(teamId);
      expect(result[0].invoiceUrl).toBe("https://stripe.com/invoice/123");
    });

    it("returns mailto prorations for regular members without billing permission", async () => {
      const userId = 2;
      const billingTeamId = 10;
      const memberTeamId = 20;

      prismaMock.membership.findMany
        .mockResolvedValueOnce([
          { teamId: billingTeamId, team: { id: billingTeamId, isOrganization: false } },
        ] as never)
        .mockResolvedValueOnce([{ teamId: billingTeamId }, { teamId: memberTeamId }] as never);

      mockFindTeamMembersWithPermission.mockResolvedValue([
        { id: userId, name: "User", email: "u@test.com", locale: null },
      ]);

      const billingProration = createProration({
        id: "pror-billing",
        teamId: billingTeamId,
        teamName: "Billing Team",
        invoiceUrl: "https://stripe.com/invoice/456",
      });

      const mailtoProration = createProration({
        id: "pror-mailto",
        teamId: memberTeamId,
        teamName: "Org With Mailto",
        isOrganization: true,
        invoiceUrl: "mailto:billing@org.com",
      });

      prismaMock.monthlyProration.findMany
        .mockResolvedValueOnce([billingProration] as never)
        .mockResolvedValueOnce([mailtoProration] as never);

      const result = await service.getBannerDataForUser(userId);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.prorationId)).toContain("pror-billing");
      expect(result.map((r) => r.prorationId)).toContain("pror-mailto");
    });

    it("does not return non-mailto prorations for regular members", async () => {
      const userId = 3;
      const memberTeamId = 30;

      prismaMock.membership.findMany
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([{ teamId: memberTeamId }] as never);

      const mailtoProration = createProration({
        id: "pror-mailto",
        teamId: memberTeamId,
        teamName: "Org",
        invoiceUrl: "mailto:admin@org.com",
      });

      prismaMock.monthlyProration.findMany.mockResolvedValueOnce([mailtoProration] as never);

      const result = await service.getBannerDataForUser(userId);

      expect(result).toHaveLength(1);
      expect(result[0].invoiceUrl).toBe("mailto:admin@org.com");
    });

    it("does not query non-billing teams when user has billing permission on all teams", async () => {
      const userId = 4;
      const teamId = 40;

      prismaMock.membership.findMany
        .mockResolvedValueOnce([
          { teamId, team: { id: teamId, isOrganization: true } },
        ] as never)
        .mockResolvedValueOnce([{ teamId }] as never);

      mockFindTeamMembersWithPermission.mockResolvedValue([
        { id: userId, name: "User", email: "u@test.com", locale: null },
      ]);

      const proration = createProration({
        id: "pror-dedup",
        teamId,
        teamName: "Org",
        isOrganization: true,
        invoiceUrl: "mailto:billing@org.com",
      });

      prismaMock.monthlyProration.findMany.mockResolvedValueOnce([proration] as never);

      const result = await service.getBannerDataForUser(userId);

      expect(result).toHaveLength(1);
      expect(result[0].prorationId).toBe("pror-dedup");
      expect(prismaMock.monthlyProration.findMany).toHaveBeenCalledTimes(1);
    });

    it("correctly sets isBlocking for prorations older than 7 days", async () => {
      const userId = 5;
      const teamId = 50;

      prismaMock.membership.findMany
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([{ teamId }] as never);

      const recentProration = createProration({
        id: "pror-recent",
        teamId,
        teamName: "Org",
        invoiceUrl: "mailto:billing@org.com",
        daysOld: 3,
      });

      const oldProration = createProration({
        id: "pror-old",
        teamId,
        teamName: "Org",
        invoiceUrl: "mailto:billing@org.com",
        daysOld: 10,
      });

      prismaMock.monthlyProration.findMany.mockResolvedValueOnce(
        [recentProration, oldProration] as never
      );

      const result = await service.getBannerDataForUser(userId);

      expect(result).toHaveLength(2);
      const recent = result.find((r) => r.prorationId === "pror-recent");
      const old = result.find((r) => r.prorationId === "pror-old");
      expect(recent?.isBlocking).toBe(false);
      expect(old?.isBlocking).toBe(true);
    });

    it("returns empty when user is a member but no mailto prorations exist", async () => {
      const userId = 6;
      const memberTeamId = 60;

      prismaMock.membership.findMany
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([{ teamId: memberTeamId }] as never);

      prismaMock.monthlyProration.findMany.mockResolvedValueOnce([] as never);

      const result = await service.getBannerDataForUser(userId);

      expect(result).toEqual([]);
    });
  });
});
