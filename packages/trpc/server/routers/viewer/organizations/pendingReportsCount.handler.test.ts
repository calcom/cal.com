import { describe, it, expect, vi, beforeEach } from "vitest";

import { PrismaBookingReportRepository } from "@calcom/features/bookingReport/repositories/PrismaBookingReportRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";

import { pendingReportsCountHandler } from "./pendingReportsCount.handler";

vi.mock("@calcom/features/pbac/services/permission-check.service");
vi.mock("@calcom/features/bookingReport/repositories/PrismaBookingReportRepository");

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

describe("pendingReportsCountHandler (Organization watchlist PBAC)", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    organizationId: 100,
    profile: { organizationId: 100 },
  };

  const mockPermissionCheckService = { checkPermission: vi.fn() };
  const mockReportRepo = { countPendingReports: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PermissionCheckService).mockImplementation(function (this: unknown) {
      return mockPermissionCheckService as InstanceType<typeof PermissionCheckService>;
    });
    vi.mocked(PrismaBookingReportRepository).mockImplementation(function (this: unknown) {
      return mockReportRepo as unknown as InstanceType<typeof PrismaBookingReportRepository>;
    });
  });

  it("returns 0 when user has no organization", async () => {
    const result = await pendingReportsCountHandler({
      ctx: { user: { ...mockUser, organizationId: undefined, profile: null } },
    });

    expect(result).toBe(0);
    expect(mockPermissionCheckService.checkPermission).not.toHaveBeenCalled();
  });

  it("returns 0 when user lacks watchlist.read permission", async () => {
    mockPermissionCheckService.checkPermission.mockResolvedValue(false);

    const result = await pendingReportsCountHandler({
      ctx: { user: mockUser },
    });

    expect(result).toBe(0);
    expect(mockReportRepo.countPendingReports).not.toHaveBeenCalled();
  });

  it("checks watchlist.read with correct parameters", async () => {
    mockPermissionCheckService.checkPermission.mockResolvedValue(true);
    mockReportRepo.countPendingReports.mockResolvedValue(5);

    await pendingReportsCountHandler({
      ctx: { user: mockUser },
    });

    expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledWith({
      userId: 1,
      teamId: 100,
      permission: "watchlist.read",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });
  });

  it("returns count from repo when user has watchlist.read", async () => {
    mockPermissionCheckService.checkPermission.mockResolvedValue(true);
    mockReportRepo.countPendingReports.mockResolvedValue(3);

    const result = await pendingReportsCountHandler({
      ctx: { user: mockUser },
    });

    expect(result).toBe(3);
    expect(mockReportRepo.countPendingReports).toHaveBeenCalledWith({ organizationId: 100 });
  });
});
