import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { IAttendeeRepository } from "@calcom/features/bookings/repositories/IAttendeeRepository";
import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";

import { BookingAuditViewerService } from "../BookingAuditViewerService";
import { BookingAuditPermissionError, BookingAuditErrorCode } from "../BookingAuditAccessService";
import type { IBookingAuditRepository, BookingAuditWithActor, BookingAuditAction, BookingAuditType } from "../../repository/IBookingAuditRepository";
import type { AuditActorType } from "../../repository/IAuditActorRepository";

vi.mock("@calcom/features/pbac/services/permission-check.service");
vi.mock("@calcom/features/users/repositories/UserRepository");
vi.mock("@calcom/features/bookings/repositories/BookingRepository");
vi.mock("@calcom/features/membership/repositories/MembershipRepository");

const createMockTeamBooking = (overrides?: {
  userId?: number;
  teamId?: number | null;
  parentTeamId?: number;
}) => ({
  userId: overrides?.userId ?? 456,
  user: {
    id: overrides?.userId ?? 456,
    email: "test@example.com",
  },
  eventType: {
    teamId: (overrides && "teamId" in overrides ? overrides.teamId : overrides?.teamId ?? 100) ?? null,
    parent: (overrides?.parentTeamId ? { teamId: overrides.parentTeamId } : undefined) ?? null,
    hosts: [],
    users: [],
  },
  attendees: [],
});


const createMockAuditLog = (
  overrides?: Partial<{
    id: string;
    bookingUid: string;
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
  }>
): BookingAuditWithActor => ({
  id: overrides?.id ?? "audit-log-1",
  bookingUid: overrides?.bookingUid ?? "booking-uid-123",
  action: overrides?.action ?? "CREATED",
  type: overrides?.type ?? "RECORD_CREATED",
  timestamp: overrides?.timestamp ?? new Date("2024-01-15T10:00:00Z"),
  createdAt: overrides?.createdAt ?? new Date("2024-01-15T10:00:00Z"),
  updatedAt: overrides?.updatedAt ?? new Date("2024-01-15T10:00:00Z"),
  actorId: overrides?.actorId ?? "actor-1",
  data: overrides?.data ?? { version: 1, fields: { startTime: 1705315200000, endTime: 1705318800000, status: "ACCEPTED" } },
  source: "WEBAPP" as const,
  operationId: "operation-id-123",
  actor: {
    id: overrides?.actorId ?? "actor-1",
    type: overrides?.actorType ?? "USER" as const,
    userUuid: (overrides && "actorUserUuid" in overrides ? overrides.actorUserUuid : "user-uuid-123") as string | null,
    attendeeId: null,
    name: (overrides && "actorName" in overrides ? overrides.actorName : "John Doe") as string | null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
  },
});

const createMockUser = (overrides?: Partial<{ id: number; name: string | null; email: string; avatarUrl: string | null }>) => ({
  id: overrides?.id ?? 123,
  name: (overrides && "name" in overrides ? overrides.name : "John Doe") as string | null,
  email: overrides?.email ?? "john@example.com",
  avatarUrl: (overrides && "avatarUrl" in overrides ? overrides.avatarUrl : null) as string | null,
});

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
  let mockLog: {
    error: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockBookingRepository = {
      findByUidIncludeEventType: vi.fn(),
      getFromRescheduleUid: vi.fn(),
    };

    mockUserRepository = {
      getUserOrganizationAndTeams: vi.fn(),
      findByUuid: vi.fn(),
    };

    mockBookingAuditRepository = {
      create: vi.fn(),
      findAllForBooking: vi.fn().mockResolvedValue([]),
      findRescheduledLogsOfBooking: vi.fn(),
    };

    mockMembershipRepository = {
      hasMembership: vi.fn(),
    };

    mockPermissionCheckService = {
      checkPermission: vi.fn(),
    };

    mockAttendeeRepository = {
      findById: vi.fn(),
    };

    mockLog = {
      error: vi.fn(),
    };

    vi.mocked(BookingRepository).mockImplementation(() => mockBookingRepository as unknown as BookingRepository);
    vi.mocked(UserRepository).mockImplementation(() => mockUserRepository as unknown as UserRepository);
    vi.mocked(MembershipRepository).mockImplementation(() => mockMembershipRepository as unknown as MembershipRepository);
    vi.mocked(PermissionCheckService).mockImplementation(() => mockPermissionCheckService as unknown as PermissionCheckService);

    service = new BookingAuditViewerService({
      bookingAuditRepository: mockBookingAuditRepository as unknown as IBookingAuditRepository,
      userRepository: mockUserRepository as unknown as UserRepository,
      bookingRepository: mockBookingRepository as unknown as BookingRepository,
      membershipRepository: mockMembershipRepository as unknown as MembershipRepository,
      attendeeRepository: mockAttendeeRepository as unknown as IAttendeeRepository,
      log: mockLog as unknown as ISimpleLogger,
    });
  });

  describe("getAuditLogsForBooking", () => {
    describe("when user has permission to view audit logs", () => {
      beforeEach(() => {
        mockBookingRepository.findByUidIncludeEventType.mockResolvedValue(
          createMockTeamBooking({ teamId: 100 })
        );
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      });

      it("should return enriched audit logs with actor information", async () => {
        const mockLog = createMockAuditLog();
        const mockUser = createMockUser();

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([mockLog]);
        mockUserRepository.findByUuid.mockResolvedValue(mockUser);

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
        const mockLog = createMockAuditLog({
          timestamp: new Date("2024-01-15T10:00:00Z"),
          createdAt: new Date("2024-01-15T10:00:00Z"),
        });

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([mockLog]);
        mockUserRepository.findByUuid.mockResolvedValue(createMockUser());

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
        const mockLog = createMockAuditLog({ action: "CREATED" });

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([mockLog]);
        mockUserRepository.findByUuid.mockResolvedValue(createMockUser());

        const result = await service.getAuditLogsForBooking({
          bookingUid: "booking-uid-123",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "America/New_York",
          organizationId: 200,
        });

        expect(result.auditLogs[0].actionDisplayTitle).toEqual({
          key: "booking_audit_action.created",
        });
      });

      it("should handle multiple audit logs in correct order", async () => {
        const logs = [
          createMockAuditLog({
            id: "log-1",
            action: "CREATED",
            timestamp: new Date("2024-01-15T10:00:00Z"),
            data: { version: 1, fields: { startTime: 1705315200000, endTime: 1705318800000, status: "ACCEPTED" } }
          }),
          createMockAuditLog({
            id: "log-2",
            action: "ACCEPTED",
            timestamp: new Date("2024-01-15T11:00:00Z"),
            data: { version: 1, fields: { status: { old: "PENDING", new: "ACCEPTED" } } }
          }),
          createMockAuditLog({
            id: "log-3",
            action: "CANCELLED",
            timestamp: new Date("2024-01-15T12:00:00Z"),
            data: {
              version: 1,
              fields: {
                status: { old: "ACCEPTED", new: "CANCELLED" },
                cancellationReason: { old: null, new: "User requested" },
                cancelledBy: { old: null, new: "user-123" },
              }
            }
          }),
        ];

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue(logs);
        mockUserRepository.findByUuid.mockResolvedValue(createMockUser());

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
        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([]);

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
        mockBookingRepository.findByUidIncludeEventType.mockResolvedValue(
          createMockTeamBooking({ teamId: 100 })
        );
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      });

      it("should enrich USER actor with user details from repository", async () => {
        const mockLog = createMockAuditLog({
          actorType: "USER",
          actorUserUuid: "user-uuid-456",
        });
        const mockUser = createMockUser({
          name: "Jane Smith",
          email: "jane@example.com",
          avatarUrl: "https://example.com/avatar.jpg",
        });

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([mockLog]);
        mockUserRepository.findByUuid.mockResolvedValue(mockUser);

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
        const mockLog = createMockAuditLog({
          actorType: "USER",
          actorName: null
        });
        const mockUser = createMockUser({ name: null, email: "user@example.com" });

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([mockLog]);
        mockUserRepository.findByUuid.mockResolvedValue(mockUser);

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
        const mockLog = createMockAuditLog({ actorType: "USER" });

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([mockLog]);
        mockUserRepository.findByUuid.mockResolvedValue(null);

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
        const mockLog = createMockAuditLog({
          actorType: "SYSTEM",
          actorUserUuid: null,
        });

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([mockLog]);

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
        const mockLog = createMockAuditLog({
          actorType: "GUEST",
          actorUserUuid: null,
          actorName: null,
        });

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([mockLog]);

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
        const mockLog = createMockAuditLog({
          actorType: "GUEST",
          actorUserUuid: null,
          actorName: "External Guest",
        });

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([mockLog]);

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
        const mockLog = createMockAuditLog({
          actorType: "ATTENDEE",
          actorUserUuid: null,
          actorName: null,
        });

        // Update the mock to include attendeeId in the actor
        const logWithAttendeeId = {
          ...mockLog,
          actor: {
            ...mockLog.actor,
            attendeeId: 999,
          },
        };

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([logWithAttendeeId]);
        mockAttendeeRepository.findById.mockResolvedValue({
          id: 999,
          name: null,
          email: "attendee@example.com",
        });

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
        const mockLog = createMockAuditLog({
          actorType: "ATTENDEE",
          actorUserUuid: null,
          actorName: "Meeting Participant",
        });

        // Update the mock to include attendeeId in the actor
        const logWithAttendeeId = {
          ...mockLog,
          actor: {
            ...mockLog.actor,
            attendeeId: 888,
          },
        };

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([logWithAttendeeId]);
        mockAttendeeRepository.findById.mockResolvedValue({
          id: 888,
          name: "Meeting Participant",
          email: "participant@example.com",
        });

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
        const mockLog = createMockAuditLog({
          actorType: "ATTENDEE",
          actorUserUuid: null,
          actorName: null,
        });

        // Update the mock to include attendeeId in the actor
        const logWithAttendeeId = {
          ...mockLog,
          actor: {
            ...mockLog.actor,
            attendeeId: 777,
          },
        };

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([logWithAttendeeId]);
        mockAttendeeRepository.findById.mockResolvedValue(null);

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
        mockBookingRepository.findByUidIncludeEventType.mockResolvedValue(
          createMockTeamBooking({ teamId: 100 })
        );
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      });

      it("should include rescheduled from log when booking was created from reschedule", async () => {
        const currentBookingLog = createMockAuditLog({
          id: "current-log",
          bookingUid: "new-booking-uid",
          action: "CREATED",
        });

        const rescheduledLog = createMockAuditLog({
          id: "rescheduled-log",
          bookingUid: "old-booking-uid",
          action: "RESCHEDULED",
          data: {
            version: 1,
            fields: {
              startTime: { old: "2024-01-15T10:00:00Z", new: "2024-01-16T10:00:00Z" },
              endTime: { old: "2024-01-15T11:00:00Z", new: "2024-01-16T11:00:00Z" },
              rescheduledToUid: { old: null, new: "new-booking-uid" },
            },
          },
        });

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([currentBookingLog]);
        mockBookingRepository.getFromRescheduleUid.mockResolvedValue("old-booking-uid");
        mockBookingAuditRepository.findRescheduledLogsOfBooking.mockResolvedValue([rescheduledLog]);
        mockUserRepository.findByUuid.mockResolvedValue(createMockUser());

        const result = await service.getAuditLogsForBooking({
          bookingUid: "new-booking-uid",
          userId: 123,
          userEmail: "user@example.com",
          userTimeZone: "UTC",
          organizationId: 200,
        });

        expect(result.auditLogs).toHaveLength(2);
        expect(result.auditLogs[0].id).toBe("rescheduled-log");
        expect(result.auditLogs[0].bookingUid).toBe("new-booking-uid");
        expect(result.auditLogs[0].actionDisplayTitle.key).toBe("booking_audit_action.rescheduled_from");
        expect(result.auditLogs[0].displayJson).toHaveProperty("rescheduledFromUid", "old-booking-uid");
        expect(result.auditLogs[1].id).toBe("current-log");
      });

      it("should not include rescheduled from log when booking was not rescheduled", async () => {
        const mockLog = createMockAuditLog();

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([mockLog]);
        mockBookingRepository.getFromRescheduleUid.mockResolvedValue(null);
        mockUserRepository.findByUuid.mockResolvedValue(createMockUser());

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
        const currentBookingLog = createMockAuditLog({
          bookingUid: "new-booking-uid",
        });

        const rescheduledLog = createMockAuditLog({
          id: "rescheduled-log",
          bookingUid: "old-booking-uid",
          action: "RESCHEDULED",
          data: {
            version: 1,
            fields: {
              startTime: { old: "2024-01-15T10:00:00Z", new: "2024-01-16T10:00:00Z" },
              endTime: { old: "2024-01-15T11:00:00Z", new: "2024-01-16T11:00:00Z" },
              rescheduledToUid: { old: null, new: "different-booking-uid" },
            },
          },
        });

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([currentBookingLog]);
        mockBookingRepository.getFromRescheduleUid.mockResolvedValue("old-booking-uid");
        mockBookingAuditRepository.findRescheduledLogsOfBooking.mockResolvedValue([rescheduledLog]);
        mockUserRepository.findByUuid.mockResolvedValue(createMockUser());

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
        mockBookingRepository.findByUidIncludeEventType.mockResolvedValue(
          createMockTeamBooking({ teamId: 100 })
        );
        mockPermissionCheckService.checkPermission.mockResolvedValue(false);
        mockMembershipRepository.hasMembership.mockResolvedValue(true);

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
        mockBookingRepository.findByUidIncludeEventType.mockResolvedValue(null);

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
        mockBookingRepository.findByUidIncludeEventType.mockResolvedValue(
          createMockTeamBooking({ teamId: 100 })
        );
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      });

      it("should pass user timezone to action service for display formatting", async () => {
        const mockLog = createMockAuditLog({
          action: "RESCHEDULED",
          data: {
            version: 1,
            fields: {
              startTime: { old: "2024-01-15T10:00:00Z", new: "2024-01-16T10:00:00Z" },
              endTime: { old: "2024-01-15T11:00:00Z", new: "2024-01-16T11:00:00Z" },
              rescheduledToUid: { old: null, new: "new-booking-uid" },
            },
          },
        });

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([mockLog]);
        mockUserRepository.findByUuid.mockResolvedValue(createMockUser());

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
        mockBookingRepository.findByUidIncludeEventType.mockResolvedValue(
          createMockTeamBooking({ teamId: 100 })
        );
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      });

      it("should handle SEAT_BOOKED action with seat information", async () => {
        const mockLog = createMockAuditLog({
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

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([mockLog]);
        mockUserRepository.findByUuid.mockResolvedValue(createMockUser());

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
        const mockLog = createMockAuditLog({
          id: "seat-rescheduled-log",
          action: "SEAT_RESCHEDULED",
          data: {
            version: 1,
            fields: {
              seatReferenceUid: "seat-ref-123",
              attendeeEmail: "attendee@example.com",
              startTime: {
                old: "2024-01-15T10:00:00Z",
                new: "2024-01-16T10:00:00Z",
              },
              endTime: {
                old: "2024-01-15T11:00:00Z",
                new: "2024-01-16T11:00:00Z",
              },
              rescheduledToBookingUid: {
                old: null,
                new: "new-booking-uid",
              },
            },
          },
        });

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([mockLog]);
        mockUserRepository.findByUuid.mockResolvedValue(createMockUser());

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
        const mockLog = createMockAuditLog({
          id: "seat-rescheduled-same-booking",
          action: "SEAT_RESCHEDULED",
          data: {
            version: 1,
            fields: {
              seatReferenceUid: "seat-ref-123",
              attendeeEmail: "attendee@example.com",
              startTime: {
                old: "2024-01-15T10:00:00Z",
                new: "2024-01-15T11:00:00Z",
              },
              endTime: {
                old: "2024-01-15T11:00:00Z",
                new: "2024-01-15T12:00:00Z",
              },
              rescheduledToBookingUid: {
                old: null,
                new: null,
              },
            },
          },
        });

        mockBookingAuditRepository.findAllForBooking.mockResolvedValue([mockLog]);
        mockUserRepository.findByUuid.mockResolvedValue(createMockUser());

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
  });
});
