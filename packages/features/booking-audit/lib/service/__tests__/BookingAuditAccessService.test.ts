import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { MembershipRole } from "@calcom/prisma/enums";

import { ErrorWithCode } from "@calcom/lib/errors";

import { BookingAuditAccessService, BookingAuditErrorCode } from "../BookingAuditAccessService";

vi.mock("@calcom/features/pbac/services/permission-check.service");
vi.mock("@calcom/features/bookings/repositories/BookingRepository");
vi.mock("@calcom/features/membership/repositories/MembershipRepository");
const DB = {
  bookings: {} as Record<
    string,
    {
      uid: string;
      userId: number | null;
      eventType: {
        teamId: number | null;
        team: { parentId: number | null } | null;
        parent: { teamId: number; team: { parentId: number | null } | null } | null;
        hosts: never[];
        users: never[];
      };
      user: { id: number; email: string };
      attendees: never[];
    }
  >,
  memberships: {} as Record<string, boolean>,
};

const createMockTeamBooking = (overrides: {
  bookingUid: string;
  userId?: number;
  teamId?: number | null;
  parentTeamId?: number;
  teamParentId?: number | null;
  parentTeamParentId?: number | null;
}) => {
  const teamId = overrides && "teamId" in overrides ? overrides.teamId : 100;
  const booking = {
    uid: overrides.bookingUid,
    userId: overrides?.userId ?? 456,
    eventType: {
      teamId: teamId ?? null,
      team: teamId ? { parentId: overrides?.teamParentId ?? null } : null,
      parent:
        overrides?.parentTeamId
          ? { teamId: overrides.parentTeamId, team: { parentId: overrides?.parentTeamParentId ?? null } }
          : null,
      hosts: [],
      users: [],
    },
    user: {
      id: overrides?.userId ?? 456,
      email: "test@example.com",
    },
    attendees: [],
  };
  DB.bookings[booking.uid] = booking;
  return booking;
};

const createMockPersonalBooking = (overrides: { userId?: number; bookingUid: string }) => {
  const booking = {
    uid: overrides.bookingUid,
    userId: overrides?.userId ?? 456,
    eventType: {
      teamId: null,
      team: null,
      parent: null,
      hosts: [],
      users: [],
    },
    attendees: [],
    user: {
      id: overrides?.userId ?? 456,
      email: "test@example.com",
    },
  };
  DB.bookings[booking.uid] = booking;
  return booking;
};

const createMockMembership = ({ userId, teamId }: { userId: number; teamId: number }) => {
  const key = `${userId}-${teamId}`;
  DB.memberships[key] = true;
};

type MockPermissionCheckService = {
  checkPermission: Mock<PermissionCheckService["checkPermission"]>;
};

const provideReadTeamAuditLogsPermission = ({
  mockPermissionCheckService,
  value,
  targetUserId,
  targetTeamId,
}: {
  mockPermissionCheckService: MockPermissionCheckService;
  value: boolean;
  targetUserId: number;
  targetTeamId: number;
}) => {
  mockPermissionCheckService.checkPermission.mockImplementation(
    ({ userId, teamId, permission, _fallbackRoles }) => {
      if (permission === "booking.readTeamAuditLogs" && userId === targetUserId && teamId === targetTeamId) {
        return Promise.resolve(value);
      }
      return Promise.resolve(false);
    }
  );
};

const provideReadOrgAuditLogsPermission = ({
  mockPermissionCheckService,
  value,
  targetUserId,
  targetTeamId,
}: {
  mockPermissionCheckService: MockPermissionCheckService;
  value: boolean;
  targetUserId: number;
  targetTeamId: number;
}) => {
  mockPermissionCheckService.checkPermission.mockImplementation(
    ({ userId, teamId, permission, _fallbackRoles }) => {
      if (permission === "booking.readOrgAuditLogs" && userId === targetUserId && teamId === targetTeamId) {
        return Promise.resolve(value);
      }
      return Promise.resolve(false);
    }
  );
};

const mockBookingRepository: {
  findByUidIncludeEventType: Mock<BookingRepository["findByUidIncludeEventType"]>;
} = {
  findByUidIncludeEventType: vi.fn().mockImplementation(({ bookingUid }) => {
    return Promise.resolve(DB.bookings[bookingUid] ?? null);
  }),
};

const mockMembershipRepository: {
  hasMembership: Mock<MembershipRepository["hasMembership"]>;
} = {
  hasMembership: vi.fn().mockImplementation(({ userId, teamId }) => {
    const key = `${userId}-${teamId}`;
    return Promise.resolve(DB.memberships[key] ?? false);
  }),
};

describe("BookingAuditAccessService - Permission Checks", () => {
  let service: BookingAuditAccessService;
  let mockPermissionCheckService: MockPermissionCheckService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Clear in-memory DB
    DB.bookings = {};
    DB.memberships = {};

    mockPermissionCheckService = {
      checkPermission: vi.fn(),
    };

    vi.mocked(BookingRepository).mockImplementation(function () {
      return mockBookingRepository as unknown as BookingRepository;
    });
    vi.mocked(MembershipRepository).mockImplementation(function () {
      return mockMembershipRepository as unknown as MembershipRepository;
    });
    vi.mocked(PermissionCheckService).mockImplementation(function () {
      return mockPermissionCheckService as unknown as PermissionCheckService;
    });

    service = new BookingAuditAccessService({
      bookingRepository: mockBookingRepository as unknown as BookingRepository,
      membershipRepository: mockMembershipRepository as unknown as MembershipRepository,
    });
  });

  describe("assertPermissions - Part 1: Scope Check (Team Bookings)", () => {
    it("should throw EVENT_TYPE_NOT_IN_ORGANIZATION when team is not in user's org", async () => {
      const bookingUid = "test-booking-uid";
      const userId = 123;
      const organizationId = 200;
      // Team 100 has parentId 999 (different org)
      createMockTeamBooking({ teamId: 100, bookingUid, teamParentId: 999 });

      await expect(
        service.assertPermissions({ bookingUid, userId, organizationId })
      ).rejects.toThrow(ErrorWithCode);
      await expect(
        service.assertPermissions({ bookingUid, userId, organizationId })
      ).rejects.toThrow(BookingAuditErrorCode.EVENT_TYPE_NOT_IN_ORGANIZATION);
    });

    it("should pass scope check when team's parentId matches user's organizationId", async () => {
      const bookingUid = "test-booking-uid";
      const userId = 123;
      const organizationId = 200;
      const teamId = 100;
      createMockTeamBooking({ teamId, bookingUid, teamParentId: organizationId });
      provideReadTeamAuditLogsPermission({
        mockPermissionCheckService,
        value: true,
        targetUserId: userId,
        targetTeamId: teamId,
      });

      await expect(
        service.assertPermissions({ bookingUid, userId, organizationId })
      ).resolves.not.toThrow();
    });

    it("should pass scope check when teamId IS the organizationId", async () => {
      const bookingUid = "test-booking-uid";
      const userId = 123;
      const organizationId = 200;
      createMockTeamBooking({ teamId: organizationId, bookingUid, teamParentId: null });
      provideReadTeamAuditLogsPermission({
        mockPermissionCheckService,
        value: true,
        targetUserId: userId,
        targetTeamId: organizationId,
      });

      await expect(
        service.assertPermissions({ bookingUid, userId, organizationId })
      ).resolves.not.toThrow();
    });
  });

  describe("assertPermissions - Part 2: Permission Check (PBAC)", () => {
    it("should grant access when user has booking.readTeamAuditLogs permission for the booking's team", async () => {
      const bookingUid = "test-booking-uid";
      const userId = 123;
      const teamId = 100;
      const organizationId = 200;
      // Team is in user's org (scope passes)
      createMockTeamBooking({ teamId, bookingUid, teamParentId: organizationId });
      provideReadTeamAuditLogsPermission({
        mockPermissionCheckService,
        value: true,
        targetUserId: userId,
        targetTeamId: teamId,
      });

      await expect(
        service.assertPermissions({ bookingUid, userId, organizationId })
      ).resolves.not.toThrow();
    });

    it("should throw ORG_MEMBER_PERMISSION_DENIED when user lacks both team and org PBAC permissions", async () => {
      const bookingUid = "test-booking-uid";
      const userId = 123;
      const teamId = 100;
      const organizationId = 200;
      // Team is in user's org (scope passes)
      createMockTeamBooking({ teamId, bookingUid, userId: 456, teamParentId: organizationId });
      provideReadTeamAuditLogsPermission({
        mockPermissionCheckService,
        value: false,
        targetUserId: userId,
        targetTeamId: teamId,
      });
      provideReadOrgAuditLogsPermission({
        mockPermissionCheckService,
        value: false,
        targetUserId: userId,
        targetTeamId: organizationId,
      });
      const promise = service.assertPermissions({ bookingUid, userId, organizationId });
      await expect(promise).rejects.toThrow(ErrorWithCode);
      await expect(promise).rejects.toThrow(BookingAuditErrorCode.ORG_MEMBER_PERMISSION_DENIED);
    });
  });

  describe("assertPermissions - Organization Bookings (Personal)", () => {
    it("should grant access to personal bookings when user is an org member and has booking.readOrgAuditLogs permission for the organization", async () => {
      const bookingUid = "test-booking-uid";
      const userId = 123;
      const organizationId = 200;
      createMockPersonalBooking({ userId: 456, bookingUid });
      createMockMembership({ userId: 456, teamId: organizationId });
      provideReadOrgAuditLogsPermission({
        mockPermissionCheckService,
        value: true,
        targetUserId: userId,
        targetTeamId: organizationId,
      });

      await service.assertPermissions({ bookingUid, userId, organizationId });

      expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledWith({
        userId,
        teamId: organizationId,
        permission: "booking.readOrgAuditLogs",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });
    });
  });

  describe("assertPermissions - Managed Events", () => {
    it("should grant access to managed event's booking when user has booking.readTeamAuditLogs permission on parent event's team", async () => {
      const bookingUid = "test-booking-uid";
      const userId = 123;
      const parentTeamId = 500;
      const organizationId = 200;
      // Parent team is in user's org
      createMockTeamBooking({ teamId: null, parentTeamId, bookingUid, parentTeamParentId: organizationId });
      provideReadTeamAuditLogsPermission({
        mockPermissionCheckService,
        value: true,
        targetUserId: userId,
        targetTeamId: parentTeamId,
      });

      await service.assertPermissions({ bookingUid, userId, organizationId });

      expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledWith({
        userId,
        teamId: parentTeamId,
        permission: "booking.readTeamAuditLogs",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });
    });

    it("should throw EVENT_TYPE_NOT_IN_ORGANIZATION when parent team is not in user's org", async () => {
      const bookingUid = "test-booking-uid";
      const userId = 123;
      const parentTeamId = 500;
      const organizationId = 200;
      // Parent team belongs to a different org (999)
      createMockTeamBooking({ teamId: null, parentTeamId, bookingUid, parentTeamParentId: 999 });

      await expect(
        service.assertPermissions({ bookingUid, userId, organizationId })
      ).rejects.toThrow(ErrorWithCode);
      await expect(
        service.assertPermissions({ bookingUid, userId, organizationId })
      ).rejects.toThrow(BookingAuditErrorCode.EVENT_TYPE_NOT_IN_ORGANIZATION);
    });

    it("should throw ORG_MEMBER_PERMISSION_DENIED when user lacks permission on parent team (but is in scope)", async () => {
      const bookingUid = "test-booking-uid";
      const userId = 123;
      const parentTeamId = 500;
      const organizationId = 200;
      // Parent team is in user's org (scope passes)
      createMockTeamBooking({ teamId: null, parentTeamId, bookingUid, userId: 456, parentTeamParentId: organizationId });
      provideReadTeamAuditLogsPermission({
        mockPermissionCheckService,
        value: false,
        targetUserId: userId,
        targetTeamId: parentTeamId,
      });
      provideReadOrgAuditLogsPermission({
        mockPermissionCheckService,
        value: false,
        targetUserId: userId,
        targetTeamId: organizationId,
      });

      await expect(service.assertPermissions({ bookingUid, userId, organizationId })).rejects.toThrow(
        ErrorWithCode
      );
      await expect(service.assertPermissions({ bookingUid, userId, organizationId })).rejects.toThrow(
        BookingAuditErrorCode.ORG_MEMBER_PERMISSION_DENIED
      );
    });
  });

  describe("assertPermissions - Edge Cases", () => {
    it("should throw error when organizationId is null", async () => {
      await expect(
        service.assertPermissions({ bookingUid: "test-booking-uid", userId: 123, organizationId: null })
      ).rejects.toThrow(ErrorWithCode);
      await expect(
        service.assertPermissions({ bookingUid: "test-booking-uid", userId: 123, organizationId: null })
      ).rejects.toThrow(BookingAuditErrorCode.ORGANIZATION_ID_REQUIRED);
    });

    it("should throw error when booking not found", async () => {
      const bookingUid = "non-existent-booking-uid";
      // Don't create any booking in DB

      await expect(
        service.assertPermissions({ bookingUid, userId: 123, organizationId: 200 })
      ).rejects.toThrow(ErrorWithCode);
      await expect(
        service.assertPermissions({ bookingUid, userId: 123, organizationId: 200 })
      ).rejects.toThrow(BookingAuditErrorCode.BOOKING_NOT_FOUND_OR_PERMISSION_DENIED);
    });

    it("should throw error when booking has no userId", async () => {
      const bookingUid = "test-booking-uid";
      const booking = {
        uid: bookingUid,
        userId: null,
        eventType: {
          teamId: null,
          team: null,
          parent: null,
          hosts: [],
          users: [],
        },
        attendees: [],
        user: {
          id: 456,
          email: "test@example.com",
        },
      };
      DB.bookings[bookingUid] = booking;

      await expect(
        service.assertPermissions({ bookingUid, userId: 123, organizationId: 200 })
      ).rejects.toThrow(ErrorWithCode);
      await expect(
        service.assertPermissions({ bookingUid, userId: 123, organizationId: 200 })
      ).rejects.toThrow(BookingAuditErrorCode.BOOKING_HAS_NO_OWNER);
    });

    it("should throw error when booking owner is not member of organization", async () => {
      const bookingUid = "test-booking-uid";
      createMockPersonalBooking({ userId: 456, bookingUid });
      // Don't create membership for userId 456 in organization 200

      await expect(
        service.assertPermissions({ bookingUid, userId: 123, organizationId: 200 })
      ).rejects.toThrow(ErrorWithCode);
      await expect(
        service.assertPermissions({ bookingUid, userId: 123, organizationId: 200 })
      ).rejects.toThrow(BookingAuditErrorCode.OWNER_NOT_IN_ORGANIZATION);
    });
  });
});
