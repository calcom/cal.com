import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindByBookingId,
  mockFindByBookingIdWithDetails,
  mockUpdateManyNoShowByBookingIdAndEmails,
  mockUpdateManyNoShowByBookingIdExcludingEmails,
  MockAttendeeRepository,
} = vi.hoisted(() => {
  const mockFindByBookingId = vi.fn();
  const mockFindByBookingIdWithDetails = vi.fn();
  const mockUpdateManyNoShowByBookingIdAndEmails = vi.fn();
  const mockUpdateManyNoShowByBookingIdExcludingEmails = vi.fn();
  class MockAttendeeRepository {
    findByBookingId = mockFindByBookingId;
    findByBookingIdWithDetails = mockFindByBookingIdWithDetails;
    updateManyNoShowByBookingIdAndEmails = mockUpdateManyNoShowByBookingIdAndEmails;
    updateManyNoShowByBookingIdExcludingEmails = mockUpdateManyNoShowByBookingIdExcludingEmails;
  }
  return {
    mockFindByBookingId,
    mockFindByBookingIdWithDetails,
    mockUpdateManyNoShowByBookingIdAndEmails,
    mockUpdateManyNoShowByBookingIdExcludingEmails,
    MockAttendeeRepository,
  };
});

vi.mock("@calcom/features/bookings/repositories/AttendeeRepository", () => ({
  AttendeeRepository: MockAttendeeRepository,
}));

const { mockOnNoShowUpdated, mockGetBookingEventHandlerService } = vi.hoisted(() => {
  const mockOnNoShowUpdated = vi.fn();
  const mockGetBookingEventHandlerService = vi.fn().mockReturnValue({
    onNoShowUpdated: mockOnNoShowUpdated,
  });
  return { mockOnNoShowUpdated, mockGetBookingEventHandlerService };
});

vi.mock("@calcom/features/bookings/di/BookingEventHandlerService.container", () => ({
  getBookingEventHandlerService: mockGetBookingEventHandlerService,
}));

vi.mock("@calcom/lib/getOrgIdFromMemberOrTeamId", () => ({
  default: vi.fn().mockResolvedValue(null),
}));

const { mockPrepareNoShowTrigger, mockSendWebhookPayload, mockCalculateMaxStartTime } = vi.hoisted(() => ({
  mockPrepareNoShowTrigger: vi.fn(),
  mockSendWebhookPayload: vi.fn(),
  mockCalculateMaxStartTime: vi.fn().mockReturnValue(1234567890),
}));

vi.mock("./common", () => ({
  prepareNoShowTrigger: mockPrepareNoShowTrigger,
  sendWebhookPayload: mockSendWebhookPayload,
  calculateMaxStartTime: mockCalculateMaxStartTime,
  log: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { triggerGuestNoShow } from "./triggerGuestNoShow";

type DBAttendee = {
  id: number;
  email: string;
  name: string;
  locale: string | null;
  timeZone: string;
  phoneNumber: string | null;
  bookingId: number | null;
  noShow: boolean | null;
};

const DB = {
  attendees: {} as Record<number, DBAttendee[]>,
};

const createMockAttendee = (overrides: {
  bookingId: number;
  email: string;
  noShow?: boolean | null;
  name?: string;
  id?: number;
}): DBAttendee => {
  const attendee: DBAttendee = {
    id: overrides.id ?? Math.floor(Math.random() * 10000),
    email: overrides.email,
    name: overrides.name ?? "Test Attendee",
    locale: "en",
    timeZone: "UTC",
    phoneNumber: null,
    bookingId: overrides.bookingId,
    noShow: overrides.noShow ?? null,
  };
  DB.attendees[overrides.bookingId] ??= [];
  DB.attendees[overrides.bookingId].push(attendee);
  return attendee;
};

const clearDB = () => {
  DB.attendees = {};
};

const createMockBooking = (overrides?: {
  id?: number;
  uid?: string;
  userId?: number;
  teamId?: number | null;
}) => ({
  id: overrides?.id ?? 1,
  uid: overrides?.uid ?? "test-booking-uid",
  startTime: new Date("2024-01-01T10:00:00Z"),
  endTime: new Date("2024-01-01T11:00:00Z"),
  title: "Test Booking",
  user: { id: overrides?.userId ?? 123 },
  eventType: {
    id: 1,
    teamId: overrides?.teamId ?? null,
    calVideoSettings: null,
  },
  attendees: [] as DBAttendee[],
});

const createMockWebhook = () => ({
  id: "webhook-1",
  subscriberUrl: "https://example.com/webhook",
  time: 5,
  timeUnit: "MINUTE" as const,
  eventTriggers: ["AFTER_GUESTS_CAL_VIDEO_NO_SHOW"],
});

const createMockHost = (email: string, id?: number) => ({
  id: id ?? Math.floor(Math.random() * 10000),
  email,
  name: "Test Host",
  isFixed: true,
  priority: 1,
  weight: 100,
  weightAdjustment: 0,
  scheduleId: null,
});

describe("triggerGuestNoShow Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDB();

    mockFindByBookingId.mockImplementation((bookingId: number) => {
      const attendees = DB.attendees[bookingId] ?? [];
      return Promise.resolve(
        attendees.map((a) => ({
          id: a.id,
          email: a.email,
          noShow: a.noShow,
        }))
      );
    });

    mockFindByBookingIdWithDetails.mockImplementation((bookingId: number) => {
      return Promise.resolve(DB.attendees[bookingId] ?? []);
    });

    mockUpdateManyNoShowByBookingIdAndEmails.mockImplementation(
      (bookingId: number, emails: string[], noShow: boolean) => {
        const attendees = DB.attendees[bookingId] ?? [];
        let count = 0;
        for (const attendee of attendees) {
          if (emails.includes(attendee.email)) {
            attendee.noShow = noShow;
            count++;
          }
        }
        return Promise.resolve({ count });
      }
    );

    mockUpdateManyNoShowByBookingIdExcludingEmails.mockImplementation(
      (bookingId: number, excludeEmails: string[], noShow: boolean) => {
        const attendees = DB.attendees[bookingId] ?? [];
        let count = 0;
        for (const attendee of attendees) {
          if (!excludeEmails.includes(attendee.email)) {
            attendee.noShow = noShow;
            count++;
          }
        }
        return Promise.resolve({ count });
      }
    );

    mockSendWebhookPayload.mockResolvedValue(undefined);
    mockOnNoShowUpdated.mockResolvedValue(undefined);
  });

  describe("Core Functionality", () => {
    it("should return early when prepareNoShowTrigger returns null", async () => {
      mockPrepareNoShowTrigger.mockResolvedValue(null);

      await triggerGuestNoShow(JSON.stringify({ bookingId: 1 }));

      expect(mockSendWebhookPayload).not.toHaveBeenCalled();
      expect(mockOnNoShowUpdated).not.toHaveBeenCalled();
    });

    it("should mark all guests as no-show when no guests joined (requireEmailForGuests=false)", async () => {
      const booking = createMockBooking({ id: 1 });
      const guest1 = createMockAttendee({ bookingId: 1, email: "guest1@example.com", noShow: false, id: 101 });
      const guest2 = createMockAttendee({ bookingId: 1, email: "guest2@example.com", noShow: false, id: 102 });
      booking.attendees = [guest1, guest2];

      const host = createMockHost("host@example.com", 123);

      mockPrepareNoShowTrigger.mockResolvedValue({
        webhook: createMockWebhook(),
        booking,
        hostsThatJoinedTheCall: [host],
        didGuestJoinTheCall: false,
        guestsThatDidntJoinTheCall: [],
        originalRescheduledBooking: null,
        participants: [],
      });

      await triggerGuestNoShow(JSON.stringify({ bookingId: 1 }));

      expect(mockUpdateManyNoShowByBookingIdExcludingEmails).toHaveBeenCalledWith(1, ["host@example.com"], true);
      expect(mockSendWebhookPayload).toHaveBeenCalled();
      expect(mockOnNoShowUpdated).toHaveBeenCalled();
    });

    it("should mark specific guests as no-show when requireEmailForGuests=true", async () => {
      const booking = createMockBooking({ id: 2 });
      booking.eventType = { id: 1, teamId: null, calVideoSettings: { requireEmailForGuests: true } };
      const guest1 = createMockAttendee({ bookingId: 2, email: "guest1@example.com", noShow: false, id: 201 });
      const guest2 = createMockAttendee({ bookingId: 2, email: "guest2@example.com", noShow: false, id: 202 });
      booking.attendees = [guest1, guest2];

      const host = createMockHost("host@example.com", 123);

      mockPrepareNoShowTrigger.mockResolvedValue({
        webhook: createMockWebhook(),
        booking,
        hostsThatJoinedTheCall: [host],
        didGuestJoinTheCall: true,
        guestsThatDidntJoinTheCall: [{ email: "guest1@example.com", name: "Guest 1" }],
        originalRescheduledBooking: null,
        participants: [],
      });

      await triggerGuestNoShow(JSON.stringify({ bookingId: 2 }));

      expect(mockUpdateManyNoShowByBookingIdAndEmails).toHaveBeenCalledWith(2, ["guest1@example.com"], true);
      expect(mockSendWebhookPayload).toHaveBeenCalled();
      expect(mockOnNoShowUpdated).toHaveBeenCalled();
    });

    it("should not trigger webhook or audit when all guests joined (requireEmailForGuests=true)", async () => {
      const booking = createMockBooking({ id: 3 });
      booking.eventType = { id: 1, teamId: null, calVideoSettings: { requireEmailForGuests: true } };
      const guest1 = createMockAttendee({ bookingId: 3, email: "guest1@example.com", noShow: false, id: 301 });
      booking.attendees = [guest1];

      const host = createMockHost("host@example.com", 123);

      mockPrepareNoShowTrigger.mockResolvedValue({
        webhook: createMockWebhook(),
        booking,
        hostsThatJoinedTheCall: [host],
        didGuestJoinTheCall: true,
        guestsThatDidntJoinTheCall: [],
        originalRescheduledBooking: null,
        participants: [],
      });

      await triggerGuestNoShow(JSON.stringify({ bookingId: 3 }));

      expect(mockUpdateManyNoShowByBookingIdAndEmails).not.toHaveBeenCalled();
      expect(mockSendWebhookPayload).not.toHaveBeenCalled();
      expect(mockOnNoShowUpdated).not.toHaveBeenCalled();
    });

    it("should not trigger webhook or audit when guest joined (requireEmailForGuests=false)", async () => {
      const booking = createMockBooking({ id: 4 });
      const guest1 = createMockAttendee({ bookingId: 4, email: "guest1@example.com", noShow: false, id: 401 });
      booking.attendees = [guest1];

      const host = createMockHost("host@example.com", 123);

      mockPrepareNoShowTrigger.mockResolvedValue({
        webhook: createMockWebhook(),
        booking,
        hostsThatJoinedTheCall: [host],
        didGuestJoinTheCall: true,
        guestsThatDidntJoinTheCall: [],
        originalRescheduledBooking: null,
        participants: [],
      });

      await triggerGuestNoShow(JSON.stringify({ bookingId: 4 }));

      expect(mockUpdateManyNoShowByBookingIdExcludingEmails).not.toHaveBeenCalled();
      expect(mockSendWebhookPayload).not.toHaveBeenCalled();
      expect(mockOnNoShowUpdated).not.toHaveBeenCalled();
    });
  });

  describe("Audit Logging", () => {
    it("should call onNoShowUpdated with correct audit data for guest no-show", async () => {
      const booking = createMockBooking({ id: 5, uid: "booking-uid-5" });
      const guest = createMockAttendee({ bookingId: 5, email: "guest@example.com", noShow: false, id: 501 });
      booking.attendees = [guest];

      const host = createMockHost("host@example.com", 123);

      mockPrepareNoShowTrigger.mockResolvedValue({
        webhook: createMockWebhook(),
        booking,
        hostsThatJoinedTheCall: [host],
        didGuestJoinTheCall: false,
        guestsThatDidntJoinTheCall: [],
        originalRescheduledBooking: null,
        participants: [],
      });

      await triggerGuestNoShow(JSON.stringify({ bookingId: 5 }));

      expect(mockOnNoShowUpdated).toHaveBeenCalledTimes(1);
      const auditCall = mockOnNoShowUpdated.mock.calls[0][0];
      expect(auditCall.bookingUid).toBe("booking-uid-5");
      expect(auditCall.source).toBe("SYSTEM");
      expect(auditCall.actor).toEqual({ identifiedBy: "id", id: "00000000-0000-0000-0000-000000000000" });
      expect(auditCall.auditData.attendeesNoShow).toBeDefined();
      expect(auditCall.auditData.attendeesNoShow[501]).toEqual({ old: false, new: true });
    });

    it("should include previous noShow value in audit data", async () => {
      const booking = createMockBooking({ id: 6, uid: "booking-uid-6" });
      const guest = createMockAttendee({ bookingId: 6, email: "guest@example.com", noShow: null, id: 601 });
      booking.attendees = [guest];

      const host = createMockHost("host@example.com", 123);

      mockPrepareNoShowTrigger.mockResolvedValue({
        webhook: createMockWebhook(),
        booking,
        hostsThatJoinedTheCall: [host],
        didGuestJoinTheCall: false,
        guestsThatDidntJoinTheCall: [],
        originalRescheduledBooking: null,
        participants: [],
      });

      await triggerGuestNoShow(JSON.stringify({ bookingId: 6 }));

      expect(mockOnNoShowUpdated).toHaveBeenCalledTimes(1);
      const auditCall = mockOnNoShowUpdated.mock.calls[0][0];
      expect(auditCall.auditData.attendeesNoShow[601]).toEqual({ old: null, new: true });
    });

    it("should not call onNoShowUpdated when no attendees were marked as no-show", async () => {
      const booking = createMockBooking({ id: 7 });
      booking.attendees = [];

      const host = createMockHost("host@example.com", 123);

      mockPrepareNoShowTrigger.mockResolvedValue({
        webhook: createMockWebhook(),
        booking,
        hostsThatJoinedTheCall: [host],
        didGuestJoinTheCall: true,
        guestsThatDidntJoinTheCall: [],
        originalRescheduledBooking: null,
        participants: [],
      });

      await triggerGuestNoShow(JSON.stringify({ bookingId: 7 }));

      expect(mockOnNoShowUpdated).not.toHaveBeenCalled();
    });
  });

  describe("Webhook Payload", () => {
    it("should send webhook with updated attendees data", async () => {
      const booking = createMockBooking({ id: 8 });
      const guest = createMockAttendee({ bookingId: 8, email: "guest@example.com", noShow: false, id: 801 });
      booking.attendees = [guest];

      const host = createMockHost("host@example.com", 123);
      const webhook = createMockWebhook();

      mockPrepareNoShowTrigger.mockResolvedValue({
        webhook,
        booking,
        hostsThatJoinedTheCall: [host],
        didGuestJoinTheCall: false,
        guestsThatDidntJoinTheCall: [],
        originalRescheduledBooking: null,
        participants: [{ email: "host@example.com" }],
      });

      await triggerGuestNoShow(JSON.stringify({ bookingId: 8 }));

      expect(mockSendWebhookPayload).toHaveBeenCalledWith(
        webhook,
        "AFTER_GUESTS_CAL_VIDEO_NO_SHOW",
        expect.objectContaining({
          id: 8,
          attendees: expect.arrayContaining([
            expect.objectContaining({
              email: "guest@example.com",
              noShow: true,
            }),
          ]),
        }),
        expect.any(Number),
        [{ email: "host@example.com" }],
        null
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle repository errors gracefully and still send webhook with original booking data", async () => {
      const booking = createMockBooking({ id: 9 });
      const guest = createMockAttendee({ bookingId: 9, email: "guest@example.com", noShow: false, id: 901 });
      booking.attendees = [guest];

      const host = createMockHost("host@example.com", 123);

      mockPrepareNoShowTrigger.mockResolvedValue({
        webhook: createMockWebhook(),
        booking,
        hostsThatJoinedTheCall: [host],
        didGuestJoinTheCall: false,
        guestsThatDidntJoinTheCall: [],
        originalRescheduledBooking: null,
        participants: [],
      });

      mockFindByBookingId.mockRejectedValue(new Error("Database error"));

      await expect(triggerGuestNoShow(JSON.stringify({ bookingId: 9 }))).resolves.not.toThrow();

      // Webhook should still be sent with original booking data when DB update fails
      expect(mockSendWebhookPayload).toHaveBeenCalled();
      // Audit should not be called since no attendees were marked as no-show
      expect(mockOnNoShowUpdated).not.toHaveBeenCalled();
    });

    it("should continue with webhook even if audit logging fails", async () => {
      const booking = createMockBooking({ id: 10 });
      const guest = createMockAttendee({ bookingId: 10, email: "guest@example.com", noShow: false, id: 1001 });
      booking.attendees = [guest];

      const host = createMockHost("host@example.com", 123);

      mockPrepareNoShowTrigger.mockResolvedValue({
        webhook: createMockWebhook(),
        booking,
        hostsThatJoinedTheCall: [host],
        didGuestJoinTheCall: false,
        guestsThatDidntJoinTheCall: [],
        originalRescheduledBooking: null,
        participants: [],
      });

      mockOnNoShowUpdated.mockRejectedValue(new Error("Audit logging failed"));

      await expect(triggerGuestNoShow(JSON.stringify({ bookingId: 10 }))).resolves.not.toThrow();

      expect(mockSendWebhookPayload).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle booking with multiple hosts", async () => {
      const booking = createMockBooking({ id: 11 });
      const guest = createMockAttendee({ bookingId: 11, email: "guest@example.com", noShow: false, id: 1101 });
      booking.attendees = [guest];

      const host1 = createMockHost("host1@example.com", 123);
      const host2 = createMockHost("host2@example.com", 124);

      mockPrepareNoShowTrigger.mockResolvedValue({
        webhook: createMockWebhook(),
        booking,
        hostsThatJoinedTheCall: [host1, host2],
        didGuestJoinTheCall: false,
        guestsThatDidntJoinTheCall: [],
        originalRescheduledBooking: null,
        participants: [],
      });

      await triggerGuestNoShow(JSON.stringify({ bookingId: 11 }));

      expect(mockUpdateManyNoShowByBookingIdExcludingEmails).toHaveBeenCalledWith(
        11,
        ["host1@example.com", "host2@example.com"],
        true
      );
    });

    it("should handle booking with no attendees", async () => {
      const booking = createMockBooking({ id: 12 });
      booking.attendees = [];

      const host = createMockHost("host@example.com", 123);

      mockPrepareNoShowTrigger.mockResolvedValue({
        webhook: createMockWebhook(),
        booking,
        hostsThatJoinedTheCall: [host],
        didGuestJoinTheCall: false,
        guestsThatDidntJoinTheCall: [],
        originalRescheduledBooking: null,
        participants: [],
      });

      await triggerGuestNoShow(JSON.stringify({ bookingId: 12 }));

      expect(mockOnNoShowUpdated).not.toHaveBeenCalled();
    });

    it("should handle rescheduled booking", async () => {
      const booking = createMockBooking({ id: 13 });
      const guest = createMockAttendee({ bookingId: 13, email: "guest@example.com", noShow: false, id: 1301 });
      booking.attendees = [guest];

      const host = createMockHost("host@example.com", 123);
      const originalBooking = createMockBooking({ id: 12, uid: "original-booking-uid" });

      mockPrepareNoShowTrigger.mockResolvedValue({
        webhook: createMockWebhook(),
        booking,
        hostsThatJoinedTheCall: [host],
        didGuestJoinTheCall: false,
        guestsThatDidntJoinTheCall: [],
        originalRescheduledBooking: originalBooking,
        participants: [],
      });

      await triggerGuestNoShow(JSON.stringify({ bookingId: 13 }));

      expect(mockSendWebhookPayload).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        originalBooking
      );
    });
  });
});
