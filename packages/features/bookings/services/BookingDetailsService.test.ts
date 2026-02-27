import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "../repositories/BookingRepository";
import { BookingDetailsService } from "./BookingDetailsService";

vi.mock("../repositories/BookingRepository");
vi.mock("@calcom/features/users/repositories/UserRepository");
vi.mock("@calcom/features/pbac/services/permission-check.service");

describe("BookingDetailsService", () => {
  let service: BookingDetailsService;
  let mockPrismaClient: PrismaClient;
  let mockBookingRepo: {
    findByUidForAuthorizationCheck: ReturnType<typeof vi.fn>;
    findByUidIncludeEventType: ReturnType<typeof vi.fn>;
    findByUidForDetails: ReturnType<typeof vi.fn>;
    findRescheduledToBooking: ReturnType<typeof vi.fn>;
    findPreviousBooking: ReturnType<typeof vi.fn>;
  };
  let mockUserRepo: {
    getUserOrganizationAndTeams: ReturnType<typeof vi.fn>;
    isAdminOfTeamOrParentOrg: ReturnType<typeof vi.fn>;
  };
  let mockPermissionCheckService: {
    checkPermission: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrismaClient = {} as PrismaClient;

    mockBookingRepo = {
      findByUidForAuthorizationCheck: vi.fn(),
      findByUidIncludeEventType: vi.fn(),
      findByUidForDetails: vi.fn(),
      findRescheduledToBooking: vi.fn(),
      findPreviousBooking: vi.fn(),
    };

    mockUserRepo = {
      getUserOrganizationAndTeams: vi.fn(),
      isAdminOfTeamOrParentOrg: vi.fn(),
    };

    mockPermissionCheckService = {
      checkPermission: vi.fn(),
    };

    vi.mocked(BookingRepository).mockImplementation(function () {
      return mockBookingRepo as unknown as BookingRepository;
    } as unknown as typeof BookingRepository);
    vi.mocked(UserRepository).mockImplementation(function () {
      return mockUserRepo as unknown as UserRepository;
    } as unknown as typeof UserRepository);
    vi.mocked(PermissionCheckService).mockImplementation(function () {
      return mockPermissionCheckService as unknown as PermissionCheckService;
    } as unknown as typeof PermissionCheckService);

    service = new BookingDetailsService(mockPrismaClient);
  });

  describe("getBookingDetails", () => {
    const ADMIN_USER_ID = 123;
    const BOOKING_OWNER_ID = 456;
    const ORG_ID = 200;
    const TEAM_ID = 300;
    const BOOKING_UID = "test-booking-uid";

    // Mock booking data that represents a personal event type (no teamId)
    const personalEventTypeBookingForAccessCheck = {
      userId: BOOKING_OWNER_ID,
      eventType: {
        teamId: null,
        users: [],
        hosts: [],
      },
      attendees: [{ email: "attendee@example.com" }],
    };

    const personalEventTypeBookingForIncludeEventType = {
      userId: BOOKING_OWNER_ID,
      user: { id: BOOKING_OWNER_ID, email: "owner@example.com" },
      eventType: {
        teamId: null,
        parent: null,
        hosts: [],
        users: [],
      },
      attendees: [{ email: "attendee@example.com" }],
    };

    const mockBookingDetails = {
      uid: BOOKING_UID,
      rescheduled: false,
      fromReschedule: null,
      tracking: {
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: null,
        utm_term: null,
        utm_content: null,
      },
    };

    describe("personal event type bookings - org/team admin access", () => {
      it("should allow an org admin to view booking details for a team member's personal event type booking", async () => {
        // Setup: Booking made by user 456 with a personal event type (no teamId)
        // User 456 belongs to org 200
        // Admin user 123 has booking.readOrgBookings permission on org 200

        // Mock for checkBookingAccessWithPBAC (used on main)
        mockBookingRepo.findByUidForAuthorizationCheck.mockResolvedValue(
          personalEventTypeBookingForAccessCheck
        );

        // Mock for doesUserIdHaveAccessToBooking (used on PR branch)
        mockBookingRepo.findByUidIncludeEventType.mockResolvedValue(
          personalEventTypeBookingForIncludeEventType
        );

        // Mock booking owner's org membership
        mockUserRepo.getUserOrganizationAndTeams.mockResolvedValue({
          organizationId: ORG_ID,
          teams: [],
        });

        // Mock permission check - admin has org booking read permission
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);

        // Mock the booking details retrieval
        mockBookingRepo.findByUidForDetails.mockResolvedValue(mockBookingDetails);

        const result = await service.getBookingDetails({
          userId: ADMIN_USER_ID,
          bookingUid: BOOKING_UID,
        });

        expect(result).toEqual({
          rescheduledToBooking: null,
          previousBooking: null,
          tracking: mockBookingDetails.tracking,
        });
      });

      it("should allow a team admin to view booking details for a team member's personal event type booking", async () => {
        // Setup: Booking made by user 456 with a personal event type (no teamId)
        // User 456 belongs to team 300
        // Admin user 123 has booking.readTeamBookings permission on team 300

        // Mock for checkBookingAccessWithPBAC (used on main)
        mockBookingRepo.findByUidForAuthorizationCheck.mockResolvedValue(
          personalEventTypeBookingForAccessCheck
        );

        // Mock for doesUserIdHaveAccessToBooking (used on PR branch)
        mockBookingRepo.findByUidIncludeEventType.mockResolvedValue(
          personalEventTypeBookingForIncludeEventType
        );

        // Mock booking owner's team memberships (no org)
        mockUserRepo.getUserOrganizationAndTeams.mockResolvedValue({
          organizationId: null,
          teams: [{ teamId: TEAM_ID }],
        });

        // Mock permission check - admin has team booking read permission
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);

        // Mock the booking details retrieval
        mockBookingRepo.findByUidForDetails.mockResolvedValue(mockBookingDetails);

        const result = await service.getBookingDetails({
          userId: ADMIN_USER_ID,
          bookingUid: BOOKING_UID,
        });

        expect(result).toEqual({
          rescheduledToBooking: null,
          previousBooking: null,
          tracking: mockBookingDetails.tracking,
        });
      });

      it("should deny access to a non-admin user viewing another user's personal event type booking", async () => {
        // Setup: Booking made by user 456 with a personal event type (no teamId)
        // User 123 is NOT an admin of any shared org/team

        // Mock for checkBookingAccessWithPBAC (used on main)
        mockBookingRepo.findByUidForAuthorizationCheck.mockResolvedValue(
          personalEventTypeBookingForAccessCheck
        );

        // Mock for doesUserIdHaveAccessToBooking (used on PR branch)
        mockBookingRepo.findByUidIncludeEventType.mockResolvedValue(
          personalEventTypeBookingForIncludeEventType
        );

        // Mock booking owner's team memberships
        mockUserRepo.getUserOrganizationAndTeams.mockResolvedValue({
          organizationId: null,
          teams: [{ teamId: TEAM_ID }],
        });

        // Mock permission check - user does NOT have permission
        mockPermissionCheckService.checkPermission.mockResolvedValue(false);

        await expect(
          service.getBookingDetails({
            userId: ADMIN_USER_ID,
            bookingUid: BOOKING_UID,
          })
        ).rejects.toThrow("You do not have permission to view this booking");
      });
    });

    describe("basic access scenarios", () => {
      it("should allow the booking owner to view their own booking details", async () => {
        const ownerBookingForAuthCheck = {
          userId: BOOKING_OWNER_ID,
          eventType: null,
          attendees: [],
        };

        const ownerBookingForIncludeEventType = {
          userId: BOOKING_OWNER_ID,
          user: { id: BOOKING_OWNER_ID, email: "owner@example.com" },
          eventType: null,
          attendees: [],
        };

        mockBookingRepo.findByUidForAuthorizationCheck.mockResolvedValue(ownerBookingForAuthCheck);
        mockBookingRepo.findByUidIncludeEventType.mockResolvedValue(ownerBookingForIncludeEventType);
        mockBookingRepo.findByUidForDetails.mockResolvedValue(mockBookingDetails);

        const result = await service.getBookingDetails({
          userId: BOOKING_OWNER_ID,
          bookingUid: BOOKING_UID,
        });

        expect(result).toEqual({
          rescheduledToBooking: null,
          previousBooking: null,
          tracking: mockBookingDetails.tracking,
        });
      });

      it("should throw Forbidden when booking is not found during access check", async () => {
        mockBookingRepo.findByUidForAuthorizationCheck.mockResolvedValue(null);
        mockBookingRepo.findByUidIncludeEventType.mockResolvedValue(null);

        await expect(
          service.getBookingDetails({
            userId: ADMIN_USER_ID,
            bookingUid: BOOKING_UID,
          })
        ).rejects.toThrow("You do not have permission to view this booking");
      });
    });
  });
});
