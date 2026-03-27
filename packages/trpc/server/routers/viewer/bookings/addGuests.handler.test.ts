import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CalendarEvent } from "@calcom/types/Calendar";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import { type Booking, type TUser, addGuestsHandler, validateUserPermissions } from "./addGuests.handler";

const {
  mockCanUpdatePersonalEventBooking,
  mockCheckPermission,
  mockGetBookingForCalEventBuilder,
  mockUpdateBookingAttendees,
  mockUpdateCalendarAttendees,
  mockCalendarEventBuild,
} = vi.hoisted(() => ({
  mockCanUpdatePersonalEventBooking: vi.fn(),
  mockCheckPermission: vi.fn(),
  mockGetBookingForCalEventBuilder: vi.fn(),
  mockUpdateBookingAttendees: vi.fn().mockResolvedValue({
    attendees: [
      { id: 1, email: "existing@example.com" },
      { id: 2, email: "newguest@example.com" },
    ],
  }),
  mockUpdateCalendarAttendees: vi.fn().mockResolvedValue({ results: [], referencesToCreate: [] }),
  mockCalendarEventBuild: vi.fn(),
}));

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
      findByIdIncludeEventTypeAttendeesUserAndReferences: mockGetBookingForCalEventBuilder,
      updateBookingAttendees: mockUpdateBookingAttendees,
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
      updateCalendarAttendees: mockUpdateCalendarAttendees,
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

vi.mock("@calcom/features/di/containers/TeamFeatureRepository", () => ({
  getTeamFeatureRepository: vi.fn().mockReturnValue({
    checkIfTeamHasFeature: vi.fn().mockResolvedValue(false),
  }),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@calcom/features/CalendarEventBuilder", () => ({
  CalendarEventBuilder: {
    fromBooking: vi.fn().mockResolvedValue({
      build: mockCalendarEventBuild,
    }),
  },
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
          team: null,
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

  describe("addGuestsHandler - custom booking field responses", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should pass custom booking field responses through to the calendar event update", async () => {
      const mockEvt: CalendarEvent = {
        type: "test-event",
        title: "Test Booking",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        organizer: {
          id: 1,
          name: "Organizer",
          email: "organizer@example.com",
          timeZone: "America/Los_Angeles",
          language: { translate: ((key: string) => key) as unknown as CalendarEvent["organizer"]["language"]["translate"], locale: "en" },
        },
        attendees: [{ name: "Guest", email: "guest@example.com", timeZone: "UTC", language: { translate: ((key: string) => key) as unknown as CalendarEvent["organizer"]["language"]["translate"], locale: "en" } }],
        responses: {
          name: { label: "your_name", value: "John Doe", isHidden: false },
          email: { label: "email_address", value: "john@example.com", isHidden: false },
          companyName: { label: "Company Name", value: "Acme Corp", isHidden: false },
        },
        userFieldsResponses: {
          companyName: { label: "Company Name", value: "Acme Corp", isHidden: false },
        },
      };

      mockCalendarEventBuild.mockReturnValue(mockEvt);

      const bookingFixture = {
        id: 1,
        uid: "booking-custom-responses",
        userId: 1,
        eventTypeId: 100,
        title: "Test Booking",
        startTime: new Date(),
        endTime: new Date(),
        description: "Test",
        metadata: null,
        location: "Office",
        responses: {
          name: "John Doe",
          email: "john@example.com",
          companyName: "Acme Corp",
          guests: [],
        },
        customInputs: null,
        iCalUID: null,
        iCalSequence: 0,
        oneTimePassword: null,
        attendees: [
          { email: "john@example.com", name: "John Doe", timeZone: "UTC", locale: "en", phoneNumber: null },
        ],
        user: {
          id: 1,
          name: "Organizer",
          email: "organizer@example.com",
          username: "organizer",
          timeZone: "America/Los_Angeles",
          locale: "en",
          timeFormat: 12,
          destinationCalendar: null,
          profiles: [],
        },
        destinationCalendar: null,
        eventType: {
          id: 100,
          slug: "test-event",
          title: "Test Event",
          description: null,
          hideCalendarNotes: false,
          hideCalendarEventDetails: false,
          hideOrganizerEmail: false,
          schedulingType: null,
          seatsPerTimeSlot: null,
          seatsShowAttendees: false,
          seatsShowAvailabilityCount: false,
          customReplyToEmail: null,
          disableRescheduling: false,
          disableCancelling: false,
          requiresConfirmation: false,
          recurringEvent: null,
          metadata: null,
          eventName: null,
          team: null,
          users: [],
          hosts: [],
          workflows: [],
          bookingFields: [
            { name: "companyName", type: "text", label: "Company Name", editable: "user", required: false },
            { name: "guests", type: "text", label: "guests", required: false, editable: "user", hidden: false },
          ],
        },
        references: [],
        seatsReferences: [],
      };

      mockGetBookingForCalEventBuilder.mockResolvedValue(bookingFixture);

      await addGuestsHandler({
        ctx: { user: { id: 1, email: "organizer@example.com", organizationId: null, uuid: "org-uuid" } },
        input: { bookingId: 1, guests: [{ email: "newguest@example.com" }] },
        emailsEnabled: false,
        actionSource: { type: "system", service: "test" },
      });

      expect(mockUpdateCalendarAttendees).toHaveBeenCalledTimes(1);
      const calEvent = mockUpdateCalendarAttendees.mock.calls[0][0] as CalendarEvent;

      expect(calEvent.responses).toBeDefined();
      expect(calEvent.responses?.companyName).toEqual({
        label: "Company Name",
        value: "Acme Corp",
        isHidden: false,
      });
      expect(calEvent.responses?.name).toEqual({
        label: "your_name",
        value: "John Doe",
        isHidden: false,
      });
      expect(calEvent.userFieldsResponses?.companyName).toEqual({
        label: "Company Name",
        value: "Acme Corp",
        isHidden: false,
      });
    });
  });

});
