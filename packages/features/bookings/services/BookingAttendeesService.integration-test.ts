import type { ActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingAttendeesService } from "./BookingAttendeesService";

vi.mock("@calcom/app-store/zod-utils", () => ({
  eventTypeMetaDataSchemaWithTypedApps: { parse: vi.fn().mockReturnValue({}) },
}));

const mockGetBooking = vi.fn();
const mockValidateUserPermissions = vi.fn();
const mockValidateGuestsFieldEnabled = vi.fn();
const mockSanitizeAndFilterGuests = vi.fn();
const mockUpdateBookingAttendees = vi.fn();
const mockUpdateCalendarEvent = vi.fn();

vi.mock("@calcom/trpc/server/routers/viewer/bookings/addGuests.handler", () => ({
  getBooking: (...args: unknown[]) => mockGetBooking(...args),
  validateUserPermissions: (...args: unknown[]) => mockValidateUserPermissions(...args),
  validateGuestsFieldEnabled: (...args: unknown[]) => mockValidateGuestsFieldEnabled(...args),
  sanitizeAndFilterGuests: (...args: unknown[]) => mockSanitizeAndFilterGuests(...args),
  updateBookingAttendees: (...args: unknown[]) => mockUpdateBookingAttendees(...args),
  updateCalendarEvent: (...args: unknown[]) => mockUpdateCalendarEvent(...args),
}));

const { mockBuild } = vi.hoisted(() => ({
  mockBuild: vi.fn().mockReturnValue({ title: "Test Event" }),
}));
vi.mock("@calcom/features/CalendarEventBuilder", () => ({
  CalendarEventBuilder: {
    fromBooking: vi.fn().mockResolvedValue({ build: (...args: unknown[]) => mockBuild(...args) }),
  },
}));

const mockHandleAddAttendee = vi.fn();
vi.mock("@calcom/features/bookings/lib/BookingEmailSmsHandler", () => {
  return {
    BookingEmailSmsHandler: class MockBookingEmailSmsHandler {
      handleAddAttendee = mockHandleAddAttendee;
    },
  };
});

const mockOnAttendeeAdded = vi.fn();
vi.mock("@calcom/features/bookings/di/BookingEventHandlerService.container", () => ({
  getBookingEventHandlerService: () => ({
    onAttendeeAdded: mockOnAttendeeAdded,
  }),
}));

const mockCheckIfTeamHasFeature = vi.fn();
vi.mock("@calcom/features/di/containers/TeamFeatureRepository", () => ({
  getTeamFeatureRepository: () => ({
    checkIfTeamHasFeature: mockCheckIfTeamHasFeature,
  }),
}));

vi.mock("@calcom/features/booking-audit/lib/makeActor", () => ({
  makeUserActor: vi.fn().mockImplementation((uuid: string) => ({ type: "user", uuid })),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: { getSubLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) },
}));

describe("BookingAttendeesService (Integration Tests)", () => {
  let service: BookingAttendeesService;

  const mockUser = {
    id: 1,
    uuid: "user-uuid-1",
    organizationId: 100,
    email: "organizer@test.com",
    name: "Organizer",
  };

  const mockAttendee = {
    email: "guest@test.com",
    name: "Guest User",
    timeZone: "America/New_York",
    language: "en",
    phoneNumber: null,
  };

  const mockBooking = {
    uid: "booking-uid-1",
    userId: 1,
    user: {
      id: 1,
      timeZone: "UTC",
      locale: "en",
    },
    eventType: { metadata: {}, schedulingType: null },
    attendees: [],
  };

  const mockActionSource: ActionSource = { sourceType: "webapp" };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BookingAttendeesService();

    mockGetBooking.mockResolvedValue(mockBooking);
    mockValidateUserPermissions.mockResolvedValue(undefined);
    mockValidateGuestsFieldEnabled.mockReturnValue(undefined);
    mockSanitizeAndFilterGuests.mockResolvedValue([mockAttendee]);
    mockUpdateCalendarEvent.mockResolvedValue(undefined);
    mockHandleAddAttendee.mockResolvedValue(undefined);
    mockOnAttendeeAdded.mockResolvedValue(undefined);
    mockCheckIfTeamHasFeature.mockResolvedValue(false);
    mockBuild.mockReturnValue({ title: "Test Event" });
  });

  describe("addAttendee", () => {
    it("successfully adds an attendee and returns CreatedAttendee", async () => {
      const createdAttendee = {
        id: 10,
        bookingId: 1,
        email: "guest@test.com",
        name: "Guest User",
        timeZone: "America/New_York",
        locale: "en",
        phoneNumber: null,
      };
      mockUpdateBookingAttendees.mockResolvedValue({
        attendees: [createdAttendee],
      });


      const result = await service.addAttendee({
        bookingId: 1,
        attendee: mockAttendee,
        user: mockUser,
        emailsEnabled: true,
        actionSource: mockActionSource,
      });

      expect(result).toEqual({
        id: 10,
        bookingId: 1,
        email: "guest@test.com",
        name: "Guest User",
        timeZone: "America/New_York",
        locale: "en",
        phoneNumber: null,
      });
    });

    it("calls validateUserPermissions with booking and user", async () => {
      const createdAttendee = {
        id: 10,
        email: "guest@test.com",
        name: "Guest User",
        timeZone: "America/New_York",
        locale: "en",
        phoneNumber: null,
      };
      mockUpdateBookingAttendees.mockResolvedValue({ attendees: [createdAttendee] });


      await service.addAttendee({
        bookingId: 1,
        attendee: mockAttendee,
        user: mockUser,
        actionSource: mockActionSource,
      });

      expect(mockValidateUserPermissions).toHaveBeenCalledWith(mockBooking, mockUser);
    });

    it("sends email notification when emailsEnabled is true", async () => {
      const createdAttendee = {
        id: 10,
        email: "guest@test.com",
        name: "Guest User",
        timeZone: "America/New_York",
        locale: "en",
        phoneNumber: null,
      };
      mockUpdateBookingAttendees.mockResolvedValue({ attendees: [createdAttendee] });


      await service.addAttendee({
        bookingId: 1,
        attendee: mockAttendee,
        user: mockUser,
        emailsEnabled: true,
        actionSource: mockActionSource,
      });

      expect(mockHandleAddAttendee).toHaveBeenCalledTimes(1);
    });

    it("skips email notification when emailsEnabled is false", async () => {
      const createdAttendee = {
        id: 10,
        email: "guest@test.com",
        name: "Guest User",
        timeZone: "America/New_York",
        locale: "en",
        phoneNumber: null,
      };
      mockUpdateBookingAttendees.mockResolvedValue({ attendees: [createdAttendee] });


      await service.addAttendee({
        bookingId: 1,
        attendee: mockAttendee,
        user: mockUser,
        emailsEnabled: false,
        actionSource: mockActionSource,
      });

      expect(mockHandleAddAttendee).not.toHaveBeenCalled();
    });

    it("fires booking audit event after adding attendee", async () => {
      const createdAttendee = {
        id: 10,
        email: "guest@test.com",
        name: "Guest User",
        timeZone: "America/New_York",
        locale: "en",
        phoneNumber: null,
      };
      mockUpdateBookingAttendees.mockResolvedValue({ attendees: [createdAttendee] });


      await service.addAttendee({
        bookingId: 1,
        attendee: mockAttendee,
        user: mockUser,
        actionSource: mockActionSource,
      });

      expect(mockOnAttendeeAdded).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingUid: "booking-uid-1",
          auditData: { addedAttendeeIds: [10] },
        })
      );
    });

    it("checks booking audit feature when user has organizationId", async () => {
      const createdAttendee = {
        id: 10,
        email: "guest@test.com",
        name: "Guest User",
        timeZone: "America/New_York",
        locale: "en",
        phoneNumber: null,
      };
      mockUpdateBookingAttendees.mockResolvedValue({ attendees: [createdAttendee] });

      mockCheckIfTeamHasFeature.mockResolvedValue(true);

      await service.addAttendee({
        bookingId: 1,
        attendee: mockAttendee,
        user: mockUser,
        actionSource: mockActionSource,
      });

      expect(mockCheckIfTeamHasFeature).toHaveBeenCalledWith(100, "booking-audit");
      expect(mockOnAttendeeAdded).toHaveBeenCalledWith(
        expect.objectContaining({ isBookingAuditEnabled: true })
      );
    });

    it("skips feature check when user has no organizationId", async () => {
      const userWithoutOrg = { ...mockUser, organizationId: null };
      const createdAttendee = {
        id: 10,
        email: "guest@test.com",
        name: "Guest User",
        timeZone: "America/New_York",
        locale: "en",
        phoneNumber: null,
      };
      mockUpdateBookingAttendees.mockResolvedValue({ attendees: [createdAttendee] });


      await service.addAttendee({
        bookingId: 1,
        attendee: mockAttendee,
        user: userWithoutOrg,
        actionSource: mockActionSource,
      });

      expect(mockCheckIfTeamHasFeature).not.toHaveBeenCalled();
      expect(mockOnAttendeeAdded).toHaveBeenCalledWith(
        expect.objectContaining({ isBookingAuditEnabled: false })
      );
    });

    it("throws error when created attendee cannot be found in updated booking", async () => {
      mockUpdateBookingAttendees.mockResolvedValue({ attendees: [] });


      await expect(
        service.addAttendee({
          bookingId: 1,
          attendee: mockAttendee,
          user: mockUser,
          actionSource: mockActionSource,
        })
      ).rejects.toThrow("Attendee was created but could not be found");
    });

    it("propagates error when getBooking fails", async () => {
      mockGetBooking.mockRejectedValue(new Error("Booking not found"));

      await expect(
        service.addAttendee({
          bookingId: 999,
          attendee: mockAttendee,
          user: mockUser,
          actionSource: mockActionSource,
        })
      ).rejects.toThrow("Booking not found");
    });

    it("propagates error when validateUserPermissions fails", async () => {
      mockValidateUserPermissions.mockRejectedValue(new Error("No permission"));

      await expect(
        service.addAttendee({
          bookingId: 1,
          attendee: mockAttendee,
          user: mockUser,
          actionSource: mockActionSource,
        })
      ).rejects.toThrow("No permission");
    });

    it("uses organizer timezone when attendee has no timezone", async () => {
      const attendeeNoTz = { ...mockAttendee, timeZone: undefined };
      const createdAttendee = {
        id: 10,
        email: "guest@test.com",
        name: "Guest User",
        timeZone: "UTC",
        locale: "en",
        phoneNumber: null,
      };
      mockSanitizeAndFilterGuests.mockResolvedValue([attendeeNoTz]);
      mockUpdateBookingAttendees.mockResolvedValue({ attendees: [createdAttendee] });


      const result = await service.addAttendee({
        bookingId: 1,
        attendee: attendeeNoTz,
        user: mockUser,
        actionSource: mockActionSource,
      });

      expect(result.timeZone).toBe("UTC");
    });
  });
});
