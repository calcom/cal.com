import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { IAttendeeRepository } from "@calcom/features/bookings/repositories/IAttendeeRepository";
import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { BookingAuditContext } from "../../dto/types";
import type { AuditActorType } from "../../repository/IAuditActorRepository";
import type {
  BookingAuditAction,
  BookingAuditType,
  BookingAuditWithActor,
  IBookingAuditRepository,
} from "../../repository/IBookingAuditRepository";
import { BookingAuditErrorCode, BookingAuditPermissionError } from "../BookingAuditAccessService";
import { BookingAuditViewerService } from "../BookingAuditViewerService";

vi.mock("@calcom/features/pbac/services/permission-check.service");
vi.mock("@calcom/features/users/repositories/UserRepository");
vi.mock("@calcom/features/bookings/repositories/BookingRepository");
vi.mock("@calcom/features/membership/repositories/MembershipRepository");
vi.mock("@calcom/features/credentials/repositories/CredentialRepository");

type MockBooking = {
  userId: number;
  user: {
    id: number;
    email: string;
  };
  eventType: {
    teamId: number | null;
    parent: { teamId: number } | null;
    hosts: unknown[];
    users: unknown[];
  } | null;
  attendees: unknown[];
  fromReschedule?: string | null;
};

type MockAttendee = {
  id: number;
  name: string | null;
  email: string;
};

type MockMembership = {
  userId: number;
  teamId: number;
};

const DB = {
  users: {} as Record<string, MockUser>,
  bookings: {} as Record<string, MockBooking>,
  auditLogs: {} as Record<string, BookingAuditWithActor[]>,
  attendees: {} as Record<number, MockAttendee>,
  memberships: {} as Record<string, boolean>, // key: "userId-teamId"
};

const createMockTeamBooking = (
  bookingUid: string,
  overrides?: {
    userId?: number;
    teamId?: number | null;
    parentTeamId?: number;
    fromReschedule?: string | null;
  }
) => {
  const booking: MockBooking = {
    userId: overrides?.userId ?? 456,
    user: {
      id: overrides?.userId ?? 456,
      email: "test@example.com",
    },
    eventType: {
      teamId: (overrides && "teamId" in overrides ? overrides.teamId : (overrides?.teamId ?? 100)) ?? null,
      parent: (overrides?.parentTeamId ? { teamId: overrides.parentTeamId } : undefined) ?? null,
      hosts: [],
      users: [],
    },
    attendees: [],
    fromReschedule: overrides?.fromReschedule,
  };

  DB.bookings[bookingUid] = booking;
  return booking;
};

const createMockAuditLog = (
  bookingUid: string,
  overrides?: Partial<{
    id: string;
    action: BookingAuditAction;
    type: BookingAuditType;
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
    data: unknown;
    actorId: string;
    actorType: AuditActorType;
    actorUserUuid: string | null;
    actorName: string | null;
    actorAttendeeId: number | null;
    context: BookingAuditContext | null;
  }>
): BookingAuditWithActor => {
  const log: BookingAuditWithActor = {
    id: overrides?.id ?? "audit-log-1",
    bookingUid,
    action: overrides?.action ?? "CREATED",
    type: overrides?.type ?? "RECORD_CREATED",
    timestamp: overrides?.timestamp ?? new Date("2024-01-15T10:00:00Z"),
    createdAt: overrides?.createdAt ?? new Date("2024-01-15T10:00:00Z"),
    updatedAt: overrides?.updatedAt ?? new Date("2024-01-15T10:00:00Z"),
    actorId: overrides?.actorId ?? "actor-1",
    data: overrides?.data ?? {
      version: 1,
      fields: {
        startTime: 1705315200000,
        endTime: 1705318800000,
        status: "ACCEPTED",
        hostUserUuid: "host-uuid",
      },
    },
    source: "WEBAPP" as const,
    operationId: "operation-id-123",
    context: (overrides && "context" in overrides ? overrides.context : null) as BookingAuditContext | null,
    actor: {
      id: overrides?.actorId ?? "actor-1",
      type: overrides?.actorType ?? ("USER" as const),
      userUuid: (overrides && "actorUserUuid" in overrides ? overrides.actorUserUuid : "user-uuid-123") as
        | string
        | null,
      attendeeId: (overrides && "actorAttendeeId" in overrides ? overrides.actorAttendeeId : null) as
        | number
        | null,
      credentialId: null,
      name: (overrides && "actorName" in overrides ? overrides.actorName : "John Doe") as string | null,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    },
  };

  if (!DB.auditLogs[bookingUid]) {
    DB.auditLogs[bookingUid] = [];
  }
  DB.auditLogs[bookingUid].push(log);
  return log;
};

type MockUser = {
  id: number;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

const createMockUser = (
  uuid?: string,
  overrides?: Partial<{ id: number; name: string | null; email: string; avatarUrl: string | null }>
) => {
  const user: MockUser = {
    id: overrides?.id ?? 123,
    name: (overrides && "name" in overrides ? overrides.name : "John Doe") as string | null,
    email: overrides?.email ?? "john@example.com",
    avatarUrl: (overrides && "avatarUrl" in overrides ? overrides.avatarUrl : null) as string | null,
  };

  if (uuid) {
    DB.users[uuid] = user;
  }

  return user;
};

const createMockAttendee = (id: number, overrides?: Partial<{ name: string | null; email: string }>) => {
  const attendee: MockAttendee = {
    id,
    name: overrides?.name ?? null,
    email: overrides?.email ?? `attendee-${id}@example.com`,
  };
  DB.attendees[id] = attendee;
  return attendee;
};

const createMockMembership = ({ userId, teamId }: { userId: number; teamId: number }) => {
  const key = `${userId}-${teamId}`;
  DB.memberships[key] = true;
};

describe("BookingAuditViewerService - Integration Tests", () => {
  let service: BookingAuditViewerService;
  let mockBookingRepository: {
    findByUidIncludeEventType: Mock<BookingRepository["findByUidIncludeEventType"]>;
    getFromRescheduleUid: Mock<BookingRepository["getFromRescheduleUid"]>;
  };
  let mockUserRepository: {
    getUserOrganizationAndTeams: Mock<UserRepository["getUserOrganizationAndTeams"]>;
    findByUuid: Mock<UserRepository["findByUuid"]>;
  };
  let mockBookingAuditRepository: {
    create: Mock<IBookingAuditRepository["create"]>;
    findAllForBooking: Mock<IBookingAuditRepository["findAllForBooking"]>;
    findRescheduledLogsOfBooking: Mock<IBookingAuditRepository["findRescheduledLogsOfBooking"]>;
  };
  let mockMembershipRepository: {
    hasMembership: Mock<MembershipRepository["hasMembership"]>;
  };
  let mockPermissionCheckService: {
    checkPermission: Mock<PermissionCheckService["checkPermission"]>;
  };
  let mockAttendeeRepository: {
    findById: Mock;
  };
  let mockCredentialRepository: {
    findByCredentialId: Mock<CredentialRepository["findByCredentialId"]>;
  };
  let mockLog: {
    error: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    DB.users = {};
    DB.bookings = {};
    DB.auditLogs = {};
    DB.attendees = {};
    DB.memberships = {};

    mockBookingRepository = {
      findByUidIncludeEventType: vi.fn().mockImplementation(({ bookingUid }: { bookingUid: string }) => {
        return Promise.resolve(DB.bookings[bookingUid] ?? null);
      }),
      getFromRescheduleUid: vi.fn().mockImplementation((bookingUid: string) => {
        const booking = DB.bookings[bookingUid];
        return Promise.resolve(booking?.fromReschedule ?? null);
      }),
    };

    mockUserRepository = {
      getUserOrganizationAndTeams: vi.fn(),
      findByUuid: vi.fn().mockImplementation(({ uuid }: { uuid: string }) => {
        return Promise.resolve(DB.users[uuid] ?? null);
      }),
    };

    mockBookingAuditRepository = {
      create: vi.fn(),
      findAllForBooking: vi.fn().mockImplementation((bookingUid: string) => {
        return Promise.resolve(DB.auditLogs[bookingUid] ?? []);
      }),
      findRescheduledLogsOfBooking: vi.fn().mockImplementation((bookingUid: string) => {
        const logs = DB.auditLogs[bookingUid] ?? [];
        return Promise.resolve(logs.filter((log) => log.action === "RESCHEDULED"));
      }),
    };

    mockMembershipRepository = {
      hasMembership: vi.fn().mockImplementation(({ userId, teamId }: { userId: number; teamId: number }) => {
        const key = `${userId}-${teamId}`;
        return Promise.resolve(DB.memberships[key] ?? false);
      }),
    };

    mockPermissionCheckService = {
      checkPermission: vi.fn(),
    };

    mockAttendeeRepository = {
      findById: vi.fn().mockImplementation((id: number) => {
        return Promise.resolve(DB.attendees[id] ?? null);
      }),
    };

    mockCredentialRepository = {
      findByCredentialId: vi.fn(),
    };

    mockLog = {
      error: vi.fn(),
    };

    vi.mocked(BookingRepository).mockImplementation(function () {
      return mockBookingRepository as unknown as BookingRepository;
    });
    vi.mocked(UserRepository).mockImplementation(function () {
      return mockUserRepository as unknown as UserRepository;
    });
    vi.mocked(MembershipRepository).mockImplementation(function () {
      return mockMembershipRepository as unknown as MembershipRepository;
    });
    vi.mocked(PermissionCheckService).mockImplementation(function () {
      return mockPermissionCheckService as unknown as PermissionCheckService;
    });
    vi.mocked(CredentialRepository).mockImplementation(function () {
      return mockCredentialRepository as unknown as CredentialRepository;
    });

    service = new BookingAuditViewerService({
      bookingAuditRepository: mockBookingAuditRepository as unknown as IBookingAuditRepository,
      userRepository: mockUserRepository as unknown as UserRepository,
      bookingRepository: mockBookingRepository as unknown as BookingRepository,
      membershipRepository: mockMembershipRepository as unknown as MembershipRepository,
      attendeeRepository: mockAttendeeRepository as unknown as IAttendeeRepository,
      credentialRepository: mockCredentialRepository as unknown as CredentialRepository,
      log: mockLog as unknown as ISimpleLogger,
    });
  });

  describe("getAuditLogsForBooking", () => {
    describe("when user has permission to view audit logs", () => {
      beforeEach(() => {
        createMockTeamBooking("booking-uid-123", { teamId: 100 });
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      });

      it("should return enriched audit logs with actor information", async () => {
        createMockAuditLog("booking-uid-123");
        createMockUser("user-uuid-123");

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "America/New_York",
          organizationId: 200,
        });

        expect(result.bookingUid).toBe("booking-uid-123");
        expect(result.auditLogs).toHaveLength(1);
        expect(result.auditLogs[0]).toMatchObject({
          id: "audit-log-1",
          bookingUid: "booking-uid-123",
          action: "CREATED",
          type: "RECORD_CREATED",
          actor: expect.objectContaining({
            type: "USER",
            displayName: "John Doe",
            displayEmail: "john@example.com",
            displayAvatar: null,
          }),
        });
      });

      it("should format timestamps as ISO strings", async () => {
        createMockAuditLog("booking-uid-123", {
          timestamp: new Date("2024-01-15T10:00:00Z"),
          createdAt: new Date("2024-01-15T10:00:00Z"),
        });

        createMockUser("user-uuid-123");

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "America/New_York",
          organizationId: 200,
        });

        expect(result.auditLogs[0].timestamp).toBe("2024-01-15T10:00:00.000Z");
        expect(result.auditLogs[0].createdAt).toBe("2024-01-15T10:00:00.000Z");
      });

      it("should include action display title with translation key", async () => {
        createMockAuditLog("booking-uid-123", { action: "CREATED" });

        createMockUser("user-uuid-123");

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "America/New_York",
          organizationId: 200,
        });

        expect(result.auditLogs[0].actionDisplayTitle).toEqual({
          key: "booking_audit_action.created",
          params: {
            host: "Unknown",
          },
        });
      });

      it("should handle multiple audit logs in correct order", async () => {
        createMockAuditLog("booking-uid-123", {
          id: "log-1",
          action: "CREATED",
          timestamp: new Date("2024-01-15T10:00:00Z"),
          data: {
            version: 1,
            fields: {
              startTime: 1705315200000,
              endTime: 1705318800000,
              status: "ACCEPTED",
              hostUserUuid: null,
            },
          },
        });
        createMockAuditLog("booking-uid-123", {
          id: "log-2",
          action: "ACCEPTED",
          timestamp: new Date("2024-01-15T11:00:00Z"),
          data: { version: 1, fields: { status: { old: "PENDING", new: "ACCEPTED" } } },
        });
        createMockAuditLog("booking-uid-123", {
          id: "log-3",
          action: "CANCELLED",
          timestamp: new Date("2024-01-15T12:00:00Z"),
          data: {
            version: 1,
            fields: {
              status: { old: "ACCEPTED", new: "CANCELLED" },
              cancellationReason: "User requested",
              cancelledBy: "user-123",
            },
          },
        });

        createMockUser("user-uuid-123");

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "America/New_York",
          organizationId: 200,
        });

        expect(result.auditLogs).toHaveLength(3);
        expect(result.auditLogs[0].id).toBe("log-1");
        expect(result.auditLogs[1].id).toBe("log-2");
        expect(result.auditLogs[2].id).toBe("log-3");
      });

      it("should return empty array when no audit logs exist", async () => {
        // Don't create any audit logs in DB

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "America/New_York",
          organizationId: 200,
        });

        expect(result.bookingUid).toBe("booking-uid-123");
        expect(result.auditLogs).toEqual([]);
      });
    });

    describe("when enriching actor information", () => {
      beforeEach(() => {
        createMockTeamBooking("booking-uid-123", { teamId: 100 });
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      });

      it("should enrich USER actor with user details from repository", async () => {
        createMockAuditLog("booking-uid-123", {
          actorType: "USER",
          actorUserUuid: "user-uuid-456",
        });
        createMockUser("user-uuid-456", {
          name: "Jane Smith",
          email: "jane@example.com",
          avatarUrl: "https://example.com/avatar.jpg",
        });

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(mockUserRepository.findByUuid).toHaveBeenCalledWith({ uuid: "user-uuid-456" });
        expect(result.auditLogs[0].actor).toMatchObject({
          displayName: "Jane Smith",
          displayEmail: "jane@example.com",
          displayAvatar: "https://example.com/avatar.jpg",
        });
      });

      it("should use email as display name when user name is null", async () => {
        createMockAuditLog("booking-uid-123", {
          actorType: "USER",
          actorName: null,
        });
        createMockUser("user-uuid-123", { name: null, email: "user@example.com" });

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs[0].actor.displayName).toBe("user@example.com");
      });

      it("should show 'Deleted User' when user not found in repository", async () => {
        createMockAuditLog("booking-uid-123", { actorType: "USER" });

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs[0].actor).toMatchObject({
          displayName: "Deleted User",
          displayEmail: null,
          displayAvatar: null,
        });
      });

      it("should show 'Cal.com' for SYSTEM actor", async () => {
        createMockAuditLog("booking-uid-123", {
          actorType: "SYSTEM",
          actorUserUuid: null,
          data: {
            version: 1,
            fields: {
              startTime: 1705315200000,
              endTime: 1705318800000,
              status: "ACCEPTED",
              hostUserUuid: null,
            },
          },
        });

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs[0].actor).toMatchObject({
          type: "SYSTEM",
          displayName: "Cal.com",
          displayEmail: null,
          displayAvatar: null,
        });
        expect(mockUserRepository.findByUuid).not.toHaveBeenCalled();
      });

      it("should show 'Guest' for GUEST actor without name", async () => {
        createMockAuditLog("booking-uid-123", {
          actorType: "GUEST",
          actorUserUuid: null,
          actorName: null,
        });

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs[0].actor).toMatchObject({
          type: "GUEST",
          displayName: "Guest",
          displayEmail: null,
          displayAvatar: null,
        });
      });

      it("should use provided name for GUEST actor", async () => {
        createMockAuditLog("booking-uid-123", {
          actorType: "GUEST",
          actorUserUuid: null,
          actorName: "External Guest",
        });

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs[0].actor.displayName).toBe("External Guest");
      });

      it("should show 'Attendee' for ATTENDEE actor without name", async () => {
        createMockAuditLog("booking-uid-123", {
          actorType: "ATTENDEE",
          actorUserUuid: null,
          actorName: null,
          actorAttendeeId: 999,
        });

        createMockAttendee(999, { name: null, email: "attendee@example.com" });

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(mockAttendeeRepository.findById).toHaveBeenCalledWith(999);
        expect(result.auditLogs[0].actor).toMatchObject({
          type: "ATTENDEE",
          displayName: "attendee@example.com",
          displayEmail: "attendee@example.com",
          displayAvatar: null,
        });
      });

      it("should use provided name for ATTENDEE actor", async () => {
        createMockAuditLog("booking-uid-123", {
          actorType: "ATTENDEE",
          actorUserUuid: null,
          actorName: "Meeting Participant",
          actorAttendeeId: 888,
        });

        createMockAttendee(888, { name: "Meeting Participant", email: "participant@example.com" });

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(mockAttendeeRepository.findById).toHaveBeenCalledWith(888);
        expect(result.auditLogs[0].actor.displayName).toBe("Meeting Participant");
        expect(result.auditLogs[0].actor.displayEmail).toBe("participant@example.com");
      });

      it("should show 'Deleted Attendee' when attendee not found in repository", async () => {
        createMockAuditLog("booking-uid-123", {
          actorType: "ATTENDEE",
          actorUserUuid: null,
          actorName: null,
          actorAttendeeId: 777,
        });

        // Don't create attendee in DB - should return null

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(mockAttendeeRepository.findById).toHaveBeenCalledWith(777);
        expect(result.auditLogs[0].actor).toMatchObject({
          type: "ATTENDEE",
          displayName: "Deleted Attendee",
          displayEmail: null,
          displayAvatar: null,
        });
      });
    });

    describe("when handling rescheduled bookings", () => {
      beforeEach(() => {
        createMockTeamBooking("new-booking-uid", { teamId: 100 });
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      });

      it("should include rescheduled from log when booking was created from reschedule", async () => {
        createMockAuditLog("new-booking-uid", {
          id: "current-log",
          action: "CREATED",
        });

        createMockAuditLog("old-booking-uid", {
          id: "rescheduled-log",
          action: "RESCHEDULED",
          data: {
            version: 1,
            fields: {
              startTime: { old: 1705315200000, new: 1705401600000 },
              endTime: { old: 1705318800000, new: 1705405200000 },
              rescheduledToUid: { old: null, new: "new-booking-uid" },
            },
          },
        });

        createMockTeamBooking("new-booking-uid", { teamId: 100, fromReschedule: "old-booking-uid" });
        createMockUser("user-uuid-123");

        const result = await service.getAuditLogsForBooking({
          bookingUid: "new-booking-uid",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs).toHaveLength(2);
        expect(result.auditLogs[1].id).toBe("rescheduled-log");
        expect(result.auditLogs[1].bookingUid).toBe("new-booking-uid");
        expect(result.auditLogs[1].actionDisplayTitle.key).toBe("booking_audit_action.rescheduled_from");
        expect(result.auditLogs[1].displayJson).toHaveProperty("rescheduledFromUid", "old-booking-uid");
        expect(result.auditLogs[0].id).toBe("current-log");
      });

      it("should not include rescheduled from log when booking was not rescheduled", async () => {
        createMockAuditLog("booking-uid-123");

        createMockTeamBooking("booking-uid-123", { teamId: 100 });
        createMockUser("user-uuid-123");

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs).toHaveLength(1);
        expect(mockBookingAuditRepository.findRescheduledLogsOfBooking).not.toHaveBeenCalled();
      });

      it("should continue without rescheduled from log when matching log not found", async () => {
        createMockAuditLog("new-booking-uid");

        createMockAuditLog("old-booking-uid", {
          id: "rescheduled-log",
          action: "RESCHEDULED",
          data: {
            version: 1,
            fields: {
              startTime: { old: 1705315200000, new: 1705401600000 },
              endTime: { old: 1705318800000, new: 1705405200000 },
              rescheduledToUid: { old: null, new: "different-booking-uid" },
            },
          },
        });

        createMockTeamBooking("new-booking-uid", { teamId: 100, fromReschedule: "old-booking-uid" });
        createMockUser("user-uuid-123");

        const result = await service.getAuditLogsForBooking({
          bookingUid: "new-booking-uid",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs).toHaveLength(1);
        expect(result.auditLogs[0].id).toBe("audit-log-1");
        expect(mockLog.error).toHaveBeenCalledWith(
          "No rescheduled log found for booking old-booking-uid -> new-booking-uid"
        );
      });
    });

    describe("when permission check fails", () => {
      it("should throw error when user lacks permission", async () => {
        createMockTeamBooking("booking-uid-123", { teamId: 100 });
        mockPermissionCheckService.checkPermission.mockResolvedValue(false);
        createMockMembership({ userId: 123, teamId: 100 });

        await expect(
          service.getAuditLogsForBooking({
            bookingUid: "booking-uid-123",
            userId: 123,
            userEmail: "user@example.com",
            userTimeZone: "UTC",
            organizationId: 200,
          })
        ).rejects.toThrow(BookingAuditPermissionError);

        expect(mockBookingAuditRepository.findAllForBooking).not.toHaveBeenCalled();
      });

      it("should throw error when organization ID is null", async () => {
        await expect(
          service.getAuditLogsForBooking({
            bookingUid: "booking-uid-123",
            userId: 123,
            userEmail: "user@example.com",
            userTimeZone: "UTC",
            organizationId: null,
          })
        ).rejects.toThrow(BookingAuditPermissionError);

        expect(mockBookingAuditRepository.findAllForBooking).not.toHaveBeenCalled();
      });

      it("should throw error when booking not found", async () => {
        // Don't create booking in DB - should return null

        await expect(
          service.getAuditLogsForBooking({
            bookingUid: "non-existent-booking",
            userId: 123,
            userEmail: "user@example.com",
            userTimeZone: "UTC",
            organizationId: 200,
          })
        ).rejects.toThrow(BookingAuditErrorCode.BOOKING_NOT_FOUND_OR_PERMISSION_DENIED);

        expect(mockBookingAuditRepository.findAllForBooking).not.toHaveBeenCalled();
      });
    });

    describe("when handling different timezones", () => {
      beforeEach(() => {
        createMockTeamBooking("booking-uid-123", { teamId: 100 });
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      });

      it("should pass user timezone to action service for display formatting", async () => {
        createMockAuditLog("booking-uid-123", {
          action: "RESCHEDULED",
          data: {
            version: 1,
            fields: {
              startTime: { old: 1705315200000, new: 1705401600000 },
              endTime: { old: 1705318800000, new: 1705405200000 },
              rescheduledToUid: { old: null, new: "new-booking-uid" },
            },
          },
        });

        createMockUser("user-uuid-123");

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "America/Los_Angeles",
          organizationId: 200,
        });

        expect(result.auditLogs[0].actionDisplayTitle).toHaveProperty("params");
        expect(result.auditLogs[0].displayJson).toBeDefined();
      });
    });

    describe("when handling seat audit actions", () => {
      beforeEach(() => {
        createMockTeamBooking("booking-uid-123", { teamId: 100 });
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      });

      it("should handle SEAT_BOOKED action with seat information", async () => {
        createMockAuditLog("booking-uid-123", {
          id: "seat-booked-log",
          action: "SEAT_BOOKED",
          data: {
            version: 1,
            fields: {
              seatReferenceUid: "seat-ref-123",
              attendeeEmail: "attendee@example.com",
              attendeeName: "Jane Attendee",
              startTime: 1705315200000,
              endTime: 1705318800000,
            },
          },
        });

        createMockUser("user-uuid-123");

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "America/New_York",
          organizationId: 200,
        });

        expect(result.auditLogs).toHaveLength(1);
        expect(result.auditLogs[0].action).toBe("SEAT_BOOKED");
        expect(result.auditLogs[0].actionDisplayTitle.key).toBe("booking_audit_action.seat_booked");
        expect(result.auditLogs[0].displayJson).toBeDefined();
      });

      it("should handle SEAT_RESCHEDULED action with time changes", async () => {
        createMockAuditLog("booking-uid-123", {
          id: "seat-rescheduled-log",
          action: "SEAT_RESCHEDULED",
          data: {
            version: 1,
            fields: {
              seatReferenceUid: "seat-ref-123",
              attendeeEmail: "attendee@example.com",
              startTime: {
                old: new Date("2024-01-15T10:00:00Z").getTime(),
                new: new Date("2024-01-16T10:00:00Z").getTime(),
              },
              endTime: {
                old: new Date("2024-01-15T11:00:00Z").getTime(),
                new: new Date("2024-01-16T11:00:00Z").getTime(),
              },
              rescheduledToBookingUid: {
                old: null,
                new: "new-booking-uid",
              },
            },
          },
        });

        createMockUser("user-uuid-123");

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "America/New_York",
          organizationId: 200,
        });

        expect(result.auditLogs).toHaveLength(1);
        expect(result.auditLogs[0].action).toBe("SEAT_RESCHEDULED");
        expect(result.auditLogs[0].actionDisplayTitle.key).toBe("booking_audit_action.seat_rescheduled");
        expect(result.auditLogs[0].actionDisplayTitle.params).toBeDefined();
        expect(result.auditLogs[0].actionDisplayTitle.components).toBeDefined();
        expect(result.auditLogs[0].displayJson).toBeDefined();
      });

      it("should handle SEAT_RESCHEDULED action without moving to different booking", async () => {
        createMockAuditLog("booking-uid-123", {
          id: "seat-rescheduled-same-booking",
          action: "SEAT_RESCHEDULED",
          data: {
            version: 1,
            fields: {
              seatReferenceUid: "seat-ref-123",
              attendeeEmail: "attendee@example.com",
              startTime: {
                old: new Date("2024-01-15T10:00:00Z").getTime(),
                new: new Date("2024-01-15T11:00:00Z").getTime(),
              },
              endTime: {
                old: new Date("2024-01-15T11:00:00Z").getTime(),
                new: new Date("2024-01-15T12:00:00Z").getTime(),
              },
              rescheduledToBookingUid: {
                old: null,
                new: null,
              },
            },
          },
        });

        createMockUser("user-uuid-123");

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs).toHaveLength(1);
        expect(result.auditLogs[0].action).toBe("SEAT_RESCHEDULED");
        expect(result.auditLogs[0].actionDisplayTitle.components).toBeUndefined();
      });
    });

    describe("when handling impersonatedBy context", () => {
      beforeEach(() => {
        createMockTeamBooking("booking-uid-123", { teamId: 100 });
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      });

      it("should enrich impersonatedBy when user exists", async () => {
        createMockAuditLog("booking-uid-123", {
          context: { impersonatedBy: "impersonator-uuid-456" },
        });
        createMockUser("user-uuid-123");
        createMockUser("impersonator-uuid-456", {
          id: 456,
          name: "Admin User",
          email: "admin@example.com",
          avatarUrl: "https://example.com/admin-avatar.jpg",
        });
        // Host lookup should return null - don't create host-uuid in DB

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(mockUserRepository.findByUuid).toHaveBeenCalledWith({ uuid: "impersonator-uuid-456" });
        expect(result.auditLogs[0].impersonatedBy).toMatchObject({
          displayName: "Admin User",
          displayEmail: "admin@example.com",
          displayAvatar: "https://example.com/admin-avatar.jpg",
        });
      });

      it("should use email as displayName when impersonator name is null", async () => {
        createMockAuditLog("booking-uid-123", {
          context: { impersonatedBy: "impersonator-uuid-456" },
        });
        createMockUser("user-uuid-123");
        createMockUser("impersonator-uuid-456", {
          id: 456,
          name: null,
          email: "admin@example.com",
          avatarUrl: null,
        });
        // Host lookup should return null - don't create host-uuid in DB

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs[0].impersonatedBy).toMatchObject({
          displayName: "admin@example.com",
          displayEmail: "admin@example.com",
          displayAvatar: null,
        });
      });

      it("should show 'Deleted User' when impersonator user not found", async () => {
        createMockAuditLog("booking-uid-123", {
          context: { impersonatedBy: "impersonator-uuid-456" },
        });
        createMockUser("user-uuid-123");
        // Don't create impersonator-uuid-456 in DB - should return null

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(mockUserRepository.findByUuid).toHaveBeenCalledWith({ uuid: "impersonator-uuid-456" });
        expect(result.auditLogs[0].impersonatedBy).toMatchObject({
          displayName: "Deleted User",
          displayEmail: null,
          displayAvatar: null,
        });
      });

      it("should return null when context is null", async () => {
        createMockAuditLog("booking-uid-123", {
          context: null,
        });

        createMockUser("user-uuid-123");

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs[0].impersonatedBy).toBeNull();
      });

      it("should return null when impersonatedBy is not in context", async () => {
        createMockAuditLog("booking-uid-123", {
          context: {},
        });

        createMockUser("user-uuid-123");

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs[0].impersonatedBy).toBeNull();
      });
    });

    describe("when enrichment fails for a single audit log", () => {
      beforeEach(() => {
        createMockTeamBooking("booking-uid-123", { teamId: 100 });
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      });

      it("should return fallback log with hasError when enrichActorInformation throws for USER actor without userUuid", async () => {
        createMockAuditLog("booking-uid-123", {
          id: "failing-log",
          actorType: "USER",
          actorUserUuid: null,
          actorName: "Test Actor",
        });

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs).toHaveLength(1);
        expect(result.auditLogs[0].hasError).toBe(true);
        expect(result.auditLogs[0].actionDisplayTitle).toEqual({
          key: "booking_audit_action.error_processing",
          params: { actionType: "CREATED" },
        });
        expect(result.auditLogs[0].displayJson).toBeNull();
        expect(result.auditLogs[0].displayFields).toBeNull();
        expect(result.auditLogs[0].actor.displayName).toBe("Test Actor");
        expect(mockLog.error).toHaveBeenCalledWith(
          expect.stringContaining("Failed to enrich audit log failing-log")
        );
      });

      it("should return fallback log with hasError when enrichActorInformation throws for ATTENDEE actor without attendeeId", async () => {
        createMockAuditLog("booking-uid-123", {
          id: "failing-attendee-log",
          actorType: "ATTENDEE",
          actorUserUuid: null,
          actorAttendeeId: null,
          actorName: null,
        });

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs).toHaveLength(1);
        expect(result.auditLogs[0].hasError).toBe(true);
        expect(result.auditLogs[0].actionDisplayTitle).toEqual({
          key: "booking_audit_action.error_processing",
          params: { actionType: "CREATED" },
        });
        expect(result.auditLogs[0].actor.displayName).toBe("Unknown");
        expect(mockLog.error).toHaveBeenCalledWith(
          expect.stringContaining("Failed to enrich audit log failing-attendee-log")
        );
      });

      it("should still return other logs when one log fails to enrich", async () => {
        createMockAuditLog("booking-uid-123", {
          id: "successful-log",
          action: "CREATED",
          actorType: "USER",
          actorUserUuid: "user-uuid-123",
        });
        createMockAuditLog("booking-uid-123", {
          id: "failing-log",
          action: "ACCEPTED",
          actorType: "USER",
          actorUserUuid: null,
          actorName: "Failing Actor",
        });
        createMockAuditLog("booking-uid-123", {
          id: "another-successful-log",
          action: "CANCELLED",
          actorType: "SYSTEM",
          actorUserUuid: null,
          data: {
            version: 1,
            fields: {
              status: { old: "ACCEPTED", new: "CANCELLED" },
              cancellationReason: "Test",
              cancelledBy: "user-123",
            },
          },
        });

        createMockUser("user-uuid-123");

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs).toHaveLength(3);

        expect(result.auditLogs[0].id).toBe("successful-log");
        expect(result.auditLogs[0].hasError).toBeUndefined();

        expect(result.auditLogs[1].id).toBe("failing-log");
        expect(result.auditLogs[1].hasError).toBe(true);
        expect(result.auditLogs[1].actor.displayName).toBe("Failing Actor");

        expect(result.auditLogs[2].id).toBe("another-successful-log");
        expect(result.auditLogs[2].hasError).toBeUndefined();
        expect(result.auditLogs[2].actor.displayName).toBe("Cal.com");
      });

      it("should log error message when enrichment fails", async () => {
        createMockAuditLog("booking-uid-123", {
          id: "error-log-id",
          actorType: "USER",
          actorUserUuid: null,
        });

        await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(mockLog.error).toHaveBeenCalledWith(
          expect.stringMatching(/Failed to enrich audit log error-log-id: .+/)
        );
      });

      it("should preserve basic log information in fallback", async () => {
        const timestamp = new Date("2024-01-15T10:00:00Z");
        const createdAt = new Date("2024-01-15T09:00:00Z");

        createMockAuditLog("booking-uid-123", {
          id: "fallback-test-log",
          action: "CREATED",
          type: "RECORD_CREATED",
          timestamp,
          createdAt,
          actorType: "USER",
          actorUserUuid: null,
          actorName: "Test Name",
        });

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs[0]).toMatchObject({
          id: "fallback-test-log",
          bookingUid: "booking-uid-123",
          action: "CREATED",
          type: "RECORD_CREATED",
          timestamp: timestamp.toISOString(),
          createdAt: createdAt.toISOString(),
          source: "WEBAPP",
          hasError: true,
          actor: expect.objectContaining({
            type: "USER",
            displayName: "Test Name",
          }),
        });
      });

      it("should use 'Unknown' as displayName when actor name is null in fallback", async () => {
        createMockAuditLog("booking-uid-123", {
          id: "null-name-log",
          actorType: "USER",
          actorUserUuid: null,
          actorName: null,
        });

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs[0].hasError).toBe(true);
        expect(result.auditLogs[0].actor.displayName).toBe("Unknown");
      });
    });
  });
});
