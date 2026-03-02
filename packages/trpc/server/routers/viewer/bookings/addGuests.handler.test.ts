import { beforeEach, describe, expect, it, vi } from "vitest";

import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import { type Booking, type TUser, validateUserPermissions } from "./addGuests.handler";

const mockCanUpdatePersonalEventBooking = vi.fn();
const mockCheckPermission = vi.fn();

vi.mock("@calcom/features/pbac/services/permission-check.service", () => ({
  PermissionCheckService: vi.fn().mockImplementation(function (this: unknown) {
    return {
      checkPermission: mockCheckPermission,
      canUpdatePersonalEventBooking: mockCanUpdatePersonalEventBooking,
    };
  }),
}));

vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => ({
  BookingRepository: vi.fn().mockImplementation(function (this: unknown) {
    return {
      findByIdIncludeDestinationCalendar: vi.fn(),
      updateBookingAttendees: vi.fn().mockResolvedValue({
        attendees: [{ email: "existing@example.com" }, { email: "newguest@example.com" }],
      }),
    };
  }),
}));

vi.mock("@calcom/features/users/repositories/UserRepository", () => ({
  UserRepository: vi.fn().mockImplementation(function (this: unknown) {
    return {
      getUserOrganizationAndTeams: vi.fn().mockResolvedValue(null),
      findManyByEmailsWithEmailVerificationSettings: vi.fn().mockResolvedValue([]),
    };
  }),
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        name: "Organizer",
        email: "organizer@example.com",
        timeZone: "Europe/London",
        locale: "en",
      }),
    },
  },
}));

vi.mock("@calcom/app-store/delegationCredential", () => ({
  getUsersCredentialsIncludeServiceAccountKey: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/features/bookings/lib/EventManager", () => ({
  default: vi.fn().mockImplementation(function (this: unknown) {
    return {
      updateCalendarAttendees: vi.fn().mockResolvedValue({ results: [], referencesToCreate: [] }),
    };
  }),
}));

vi.mock("@calcom/features/bookings/lib/BookingEmailSmsHandler", () => ({
  BookingEmailSmsHandler: vi.fn().mockImplementation(function (this: unknown) {
    return {
      handleAddGuests: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

vi.mock("@calcom/features/bookings/di/BookingEventHandlerService.container", () => ({
  getBookingEventHandlerService: vi.fn().mockReturnValue({
    onAttendeeAdded: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@calcom/features/di/containers/FeaturesRepository", () => ({
  getFeaturesRepository: vi.fn().mockReturnValue({
    checkIfTeamHasFeature: vi.fn().mockResolvedValue(false),
  }),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

describe("addGuests.handler", () => {
  describe("validateUserPermissions - team admin/owner and member personal booking", () => {
    const TEAM_ADMIN_ID = 101;
    const TEAM_MEMBER_ORGANIZER_ID = 202;

    const teamAdminUser: TUser = {
      id: TEAM_ADMIN_ID,
      email: "admin@team.com",
      organizationId: null,
      uuid: "admin-uuid",
    };

    const createPersonalBooking = (organizerId: number): Booking =>
      ({
        id: 1,
        uid: "booking-1",
        userId: organizerId,
        user: {
          id: organizerId,
          email: "organizer@example.com",
          profiles: [],
          destinationCalendar: null,
        },
        eventType: {
          id: 1,
          teamId: null,
          title: "Personal Meeting",
          bookingFields: [
            { name: "guests", type: "text", required: false, editable: "user", hidden: false },
          ],
        },
        attendees: [{ email: "attendee@example.com" }],
      }) as unknown as Booking;

    beforeEach(() => {
      vi.clearAllMocks();
      mockCheckPermission.mockResolvedValue(false);
      mockCanUpdatePersonalEventBooking.mockResolvedValue(false);
    });

    it("should allow team admin to add guests to their member's personal booking", async () => {
      const booking = createPersonalBooking(TEAM_MEMBER_ORGANIZER_ID);
      mockCanUpdatePersonalEventBooking.mockResolvedValue(true);

      await expect(
        validateUserPermissions(booking, teamAdminUser)
      ).resolves.not.toThrow();

      expect(mockCanUpdatePersonalEventBooking).toHaveBeenCalledWith({
        userId: TEAM_ADMIN_ID,
        organizerUserId: TEAM_MEMBER_ORGANIZER_ID,
        permission: "booking.update",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });
    });

    it("should allow team owner to add guests to their member's personal booking", async () => {
      const booking = createPersonalBooking(TEAM_MEMBER_ORGANIZER_ID);
      mockCanUpdatePersonalEventBooking.mockResolvedValue(true);

      await expect(
        validateUserPermissions(booking, teamAdminUser)
      ).resolves.not.toThrow();

      expect(mockCanUpdatePersonalEventBooking).toHaveBeenCalledWith({
        userId: TEAM_ADMIN_ID,
        organizerUserId: TEAM_MEMBER_ORGANIZER_ID,
        permission: "booking.update",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });
    });

    it("should deny team admin when organizer is not in their team", async () => {
      const booking = createPersonalBooking(TEAM_MEMBER_ORGANIZER_ID);
      mockCanUpdatePersonalEventBooking.mockResolvedValue(false);

      await expect(validateUserPermissions(booking, teamAdminUser)).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "you_do_not_have_permission",
      });
    });
  });

});
