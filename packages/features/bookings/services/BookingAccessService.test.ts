import { describe, it, expect, beforeEach, vi } from "vitest";

import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { BookingRepository } from "../repositories/BookingRepository";
import { BookingAccessService } from "./BookingAccessService";

vi.mock("../repositories/BookingRepository");
vi.mock("@calcom/features/users/repositories/UserRepository");

describe("BookingAccessService", () => {
  let service: BookingAccessService;
  let mockPrismaClient: PrismaClient;
  let mockBookingRepo: {
    findByUidIncludeEventType: ReturnType<typeof vi.fn>;
  };
  let mockUserRepo: {
    getUserOrganizationAndTeams: ReturnType<typeof vi.fn>;
  };
  let mockPermissionCheckService: {
    checkPermission: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrismaClient = {} as PrismaClient;

    mockBookingRepo = {
      findByUidIncludeEventType: vi.fn(),
    };

    mockUserRepo = {
      getUserOrganizationAndTeams: vi.fn(),
    };

    mockPermissionCheckService = {
      checkPermission: vi.fn(),
    };

    vi.mocked(BookingRepository).mockImplementation(function () {
      return mockBookingRepo as any;
    });
    vi.mocked(UserRepository).mockImplementation(function () {
      return mockUserRepo as any;
    });

    service = new BookingAccessService(mockPrismaClient);

    (service as any).permissionCheckService = mockPermissionCheckService;
  });

  describe("doesUserIdHaveAccessToBooking", () => {
    describe("Case 1: Booking Organizer", () => {
      it("should return true when user is the booking organizer", async () => {
        const mockBooking = {
          userId: 123,
          eventType: null,
          attendees: [],
        };

        mockBookingRepo.findByUidIncludeEventType.mockResolvedValue(mockBooking);

        const result = await service.doesUserIdHaveAccessToBooking({
          userId: 123,
          bookingUid: "test-booking-uid",
        });

        expect(result).toBe(true);
        expect(mockBookingRepo.findByUidIncludeEventType).toHaveBeenCalledWith({
          bookingUid: "test-booking-uid",
        });
      });

      it("should return false when user is not the organizer and booking has no team", async () => {
        const mockBooking = {
          userId: 456,
          eventType: null,
          attendees: [],
        };

        mockBookingRepo.findByUidIncludeEventType.mockResolvedValue(mockBooking);
        mockUserRepo.getUserOrganizationAndTeams.mockResolvedValue(null);

        const result = await service.doesUserIdHaveAccessToBooking({
          userId: 123,
          bookingUid: "test-booking-uid",
        });

        expect(result).toBe(false);
      });
    });

    describe("Case 2: Booking Host", () => {
      it("should return true when user is a host in eventType.hosts", async () => {
        const mockBooking = {
          userId: 456,
          user: { id: 456, email: "organizer@example.com" },
          eventType: {
            hosts: [
              { userId: 123, user: { email: "host@example.com" } },
              { userId: 789, user: { email: "other-host@example.com" } },
            ],
            users: [],
          },
          attendees: [{ email: "host@example.com" }],
        };

        mockBookingRepo.findByUidIncludeEventType.mockResolvedValue(mockBooking);

        const result = await service.doesUserIdHaveAccessToBooking({
          userId: 123,
          bookingUid: "test-booking-uid",
        });

        expect(result).toBe(true);
      });

      it("should return true when user is in eventType.users", async () => {
        const mockBooking = {
          userId: 456,
          user: { id: 456, email: "organizer@example.com" },
          eventType: {
            hosts: [],
            users: [
              { id: 123, email: "user@example.com" },
              { id: 789, email: "other-user@example.com" },
            ],
          },
          attendees: [{ email: "user@example.com" }],
        };

        mockBookingRepo.findByUidIncludeEventType.mockResolvedValue(mockBooking);

        const result = await service.doesUserIdHaveAccessToBooking({
          userId: 123,
          bookingUid: "test-booking-uid",
        });

        expect(result).toBe(true);
      });

      it("should return false when user is not a host", async () => {
        const mockBooking = {
          userId: 456,
          user: { id: 456, email: "organizer@example.com" },
          eventType: {
            hosts: [{ userId: 789, user: { email: "host@example.com" } }],
            users: [],
          },
          attendees: [{ email: "host@example.com" }],
        };

        mockBookingRepo.findByUidIncludeEventType.mockResolvedValue(mockBooking);
        mockUserRepo.getUserOrganizationAndTeams.mockResolvedValue(null);

        const result = await service.doesUserIdHaveAccessToBooking({
          userId: 123,
          bookingUid: "test-booking-uid",
        });

        expect(result).toBe(false);
      });
    });

    describe("Case 3: Team Event Access", () => {
      it("should return true when user has booking.readTeamBookings permission", async () => {
        const mockBooking = {
          userId: 456,
          eventType: {
            teamId: 100,
          },
          attendees: [],
        };

        mockBookingRepo.findByUidIncludeEventType.mockResolvedValue(mockBooking);
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);

        const result = await service.doesUserIdHaveAccessToBooking({
          userId: 123,
          bookingUid: "test-booking-uid",
        });

        expect(result).toBe(true);
        expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledWith({
          userId: 123,
          teamId: 100,
          permission: "booking.readTeamBookings",
          fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
        });
      });

      it("should return false when user lacks booking.readTeamBookings permission", async () => {
        const mockBooking = {
          userId: 456,
          eventType: {
            teamId: 100,
          },
          attendees: [],
        };

        mockBookingRepo.findByUidIncludeEventType.mockResolvedValue(mockBooking);
        mockPermissionCheckService.checkPermission.mockResolvedValue(false);

        const result = await service.doesUserIdHaveAccessToBooking({
          userId: 123,
          bookingUid: "test-booking-uid",
        });

        expect(result).toBe(false);
        expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledWith({
          userId: 123,
          teamId: 100,
          permission: "booking.readTeamBookings",
          fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
        });
      });
    });

    describe("Case 4: Org Admin Access (Personal Bookings)", () => {
      it("should return true when user has booking.readOrgBookings permission", async () => {
        const mockBooking = {
          userId: 456,
          eventType: null,
          attendees: [],
        };

        const mockBookingOwner = {
          organizationId: 200,
          teams: [],
        };

        mockBookingRepo.findByUidIncludeEventType.mockResolvedValue(mockBooking);
        mockUserRepo.getUserOrganizationAndTeams.mockResolvedValue(mockBookingOwner);
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);

        const result = await service.doesUserIdHaveAccessToBooking({
          userId: 123,
          bookingUid: "test-booking-uid",
        });

        expect(result).toBe(true);
        expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledWith({
          userId: 123,
          teamId: 200,
          permission: "booking.readOrgBookings",
          fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
        });
      });

      it("should return false when user lacks booking.readOrgBookings permission", async () => {
        const mockBooking = {
          userId: 456,
          eventType: null,
          attendees: [],
        };

        const mockBookingOwner = {
          organizationId: 200,
          teams: [],
        };

        mockBookingRepo.findByUidIncludeEventType.mockResolvedValue(mockBooking);
        mockUserRepo.getUserOrganizationAndTeams.mockResolvedValue(mockBookingOwner);
        mockPermissionCheckService.checkPermission.mockResolvedValue(false);

        const result = await service.doesUserIdHaveAccessToBooking({
          userId: 123,
          bookingUid: "test-booking-uid",
        });

        expect(result).toBe(false);
      });
    });

    describe("Case 5: Team Admin Access (Personal Bookings)", () => {
      it("should return true when user has booking.readTeamBookings on ANY team", async () => {
        const mockBooking = {
          userId: 456,
          eventType: null,
          attendees: [],
        };

        const mockBookingOwner = {
          organizationId: null,
          teams: [{ teamId: 300 }, { teamId: 400 }],
        };

        mockBookingRepo.findByUidIncludeEventType.mockResolvedValue(mockBooking);
        mockUserRepo.getUserOrganizationAndTeams.mockResolvedValue(mockBookingOwner);
        mockPermissionCheckService.checkPermission
          .mockResolvedValueOnce(false) // Team 300 - no permission
          .mockResolvedValueOnce(true); // Team 400 - has permission

        const result = await service.doesUserIdHaveAccessToBooking({
          userId: 123,
          bookingUid: "test-booking-uid",
        });

        expect(result).toBe(true);
        expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledTimes(2);
        expect(mockPermissionCheckService.checkPermission).toHaveBeenNthCalledWith(1, {
          userId: 123,
          teamId: 300,
          permission: "booking.readTeamBookings",
          fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
        });
        expect(mockPermissionCheckService.checkPermission).toHaveBeenNthCalledWith(2, {
          userId: 123,
          teamId: 400,
          permission: "booking.readTeamBookings",
          fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
        });
      });

      it("should return false when user lacks permission on all teams", async () => {
        const mockBooking = {
          userId: 456,
          eventType: null,
          attendees: [],
        };

        const mockBookingOwner = {
          organizationId: null,
          teams: [{ teamId: 300 }, { teamId: 400 }],
        };

        mockBookingRepo.findByUidIncludeEventType.mockResolvedValue(mockBooking);
        mockUserRepo.getUserOrganizationAndTeams.mockResolvedValue(mockBookingOwner);
        mockPermissionCheckService.checkPermission.mockResolvedValue(false);

        const result = await service.doesUserIdHaveAccessToBooking({
          userId: 123,
          bookingUid: "test-booking-uid",
        });

        expect(result).toBe(false);
        expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledTimes(2);
      });
    });
  });
});
