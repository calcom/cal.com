import { makeUserActor } from "@calcom/features/booking-audit/lib/makeActor";
import { beforeEach, describe, expect, it, vi } from "vitest";
import handleMarkNoShow, { handleMarkHostNoShow } from "./handleMarkNoShow";

const { mockPrismaBookingUpdate, mockPrismaAttendeeUpdate, mockPrismaAttendeeFindMany } = vi.hoisted(() => ({
  mockPrismaBookingUpdate: vi.fn(),
  mockPrismaAttendeeUpdate: vi.fn(),
  mockPrismaAttendeeFindMany: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    booking: { update: mockPrismaBookingUpdate },
    attendee: {
      findMany: mockPrismaAttendeeFindMany,
      update: mockPrismaAttendeeUpdate,
    },
  },
}));

const {
  mockFindByUidIncludeEventTypeAttendeesAndUser,
  mockFindByUidIncludeEventTypeAndReferences,
  mockUpdateNoShowHost,
  MockBookingRepository,
} = vi.hoisted(() => {
  const mockFindByUidIncludeEventTypeAttendeesAndUser = vi.fn();
  const mockFindByUidIncludeEventTypeAndReferences = vi.fn();
  const mockUpdateNoShowHost = vi.fn();
  class MockBookingRepository {
    findByUidIncludeEventTypeAttendeesAndUser = mockFindByUidIncludeEventTypeAttendeesAndUser;
    findByUidIncludeEventTypeAndReferences = mockFindByUidIncludeEventTypeAndReferences;
    updateNoShowHost = mockUpdateNoShowHost;
  }
  return {
    mockFindByUidIncludeEventTypeAttendeesAndUser,
    mockFindByUidIncludeEventTypeAndReferences,
    mockUpdateNoShowHost,
    MockBookingRepository,
  };
});

vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => ({
  BookingRepository: MockBookingRepository,
}));

const {
  mockFindByBookingUidAndEmails,
  mockFindIdAndEmailByBookingUidAndEmails,
  mockUpdateNoShow,
  MockAttendeeRepository,
} = vi.hoisted(() => {
  const mockFindByBookingUidAndEmails = vi.fn();
  const mockFindIdAndEmailByBookingUidAndEmails = vi.fn();
  const mockUpdateNoShow = vi.fn();
  class MockAttendeeRepository {
    findByBookingUidAndEmails = mockFindByBookingUidAndEmails;
    findIdAndEmailByBookingUidAndEmails = mockFindIdAndEmailByBookingUidAndEmails;
    updateNoShow = mockUpdateNoShow;
  }
  return {
    mockFindByBookingUidAndEmails,
    mockFindIdAndEmailByBookingUidAndEmails,
    mockUpdateNoShow,
    MockAttendeeRepository,
  };
});

vi.mock("@calcom/features/bookings/repositories/AttendeeRepository", () => ({
  AttendeeRepository: MockAttendeeRepository,
}));

const { mockDoesUserIdHaveAccessToBooking, MockBookingAccessService } = vi.hoisted(() => {
  const mockDoesUserIdHaveAccessToBooking = vi.fn();
  class MockBookingAccessService {
    doesUserIdHaveAccessToBooking = mockDoesUserIdHaveAccessToBooking;
  }
  return { mockDoesUserIdHaveAccessToBooking, MockBookingAccessService };
});

vi.mock("@calcom/features/bookings/services/BookingAccessService", () => ({
  BookingAccessService: MockBookingAccessService,
}));

const { mockWebhookServiceInit, mockSendPayload } = vi.hoisted(() => ({
  mockWebhookServiceInit: vi.fn(),
  mockSendPayload: vi.fn(),
}));

vi.mock("@calcom/features/webhooks/lib/WebhookService", () => ({
  WebhookService: {
    init: mockWebhookServiceInit,
  },
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

vi.mock("@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType", () => ({
  getAllWorkflowsFromEventType: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/lib/getOrgIdFromMemberOrTeamId", () => ({
  default: vi.fn().mockResolvedValue(null),
}));

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi
    .fn()
    .mockResolvedValue((key: string, opts?: { x?: string }) => (opts?.x ? `${opts.x} ${key}` : key)),
}));

vi.mock("./noShow/handleSendingAttendeeNoShowDataToApps", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

const DB = {
  bookings: {} as Record<string, DBBooking>,
  attendees: {} as Record<string, DBAttendee[]>,
};

type DBBooking = {
  uid: string;
  id: number;
  userId: number;
  noShowHost: boolean | null;
  startTime: Date;
  endTime: Date;
  title: string;
  location: string | null;
  userPrimaryEmail: string | null;
  smsReminderNumber: string | null;
  destinationCalendar: null;
  metadata: null;
  eventType: {
    id: number;
    teamId: number | null;
    userId: number | null;
    slug: string;
    schedulingType: null;
    hosts: never[];
    owner: null;
    hideOrganizerEmail: boolean;
    customReplyToEmail: null;
    team: null;
  } | null;
  user: {
    id: number;
    uuid: string;
    email: string;
    name: string;
    locale: string;
    timeZone: string;
    timeFormat: number;
    username: string;
    destinationCalendar: null;
    hideBranding: boolean;
  } | null;
  attendees: {
    id: number;
    email: string;
    name: string;
    noShow: boolean | null;
    locale: string;
    timeZone: string;
    phoneNumber: string | null;
  }[];
};

type DBAttendee = {
  id: number;
  email: string;
  noShow: boolean | null;
};

const createMockBooking = (overrides: {
  uid: string;
  userId?: number;
  noShowHost?: boolean | null;
  startTime?: Date;
  endTime?: Date;
  hasEventType?: boolean;
}) => {
  const booking: DBBooking = {
    uid: overrides.uid,
    id: 1,
    userId: overrides.userId ?? 123,
    noShowHost: overrides.noShowHost ?? null,
    startTime: overrides.startTime ?? new Date(Date.now() - 3600000),
    endTime: overrides.endTime ?? new Date(Date.now() + 3600000),
    title: "Test Meeting",
    location: null,
    userPrimaryEmail: "host@example.com",
    smsReminderNumber: null,
    destinationCalendar: null,
    metadata: null,
    eventType:
      overrides.hasEventType !== false
        ? {
            id: 1,
            teamId: null,
            userId: overrides.userId ?? 123,
            slug: "test-event",
            schedulingType: null,
            hosts: [],
            owner: null,
            hideOrganizerEmail: false,
            customReplyToEmail: null,
            team: null,
          }
        : null,
    user: {
      id: overrides.userId ?? 123,
      uuid: "host-uuid-123",
      email: "host@example.com",
      name: "Test Host",
      locale: "en",
      timeZone: "UTC",
      timeFormat: 12,
      username: "testhost",
      destinationCalendar: null,
      hideBranding: false,
    },
    attendees: [],
  };
  DB.bookings[booking.uid] = booking;
  DB.attendees[booking.uid] = [];
  return booking;
};

const createMockAttendee = (overrides: {
  bookingUid: string;
  email: string;
  noShow?: boolean | null;
  name?: string;
}) => {
  const attendee: DBAttendee = {
    id: Date.now() + Math.random(),
    email: overrides.email,
    noShow: overrides.noShow ?? null,
  };
  DB.attendees[overrides.bookingUid] ??= [];
  DB.attendees[overrides.bookingUid].push(attendee);

  const booking = DB.bookings[overrides.bookingUid];
  if (booking) {
    booking.attendees.push({
      id: attendee.id,
      email: attendee.email,
      name: overrides.name ?? "Test Attendee",
      noShow: attendee.noShow,
      locale: "en",
      timeZone: "UTC",
      phoneNumber: null,
    });
  }
  return attendee;
};

const clearDB = () => {
  DB.bookings = {};
  DB.attendees = {};
};

const expectAttendeeNoShowState = (bookingUid: string, email: string, expectedNoShow: boolean) => {
  const attendee = DB.attendees[bookingUid]?.find((a) => a.email === email);
  expect(attendee).toBeDefined();
  expect(attendee?.noShow).toBe(expectedNoShow);
};

const expectBookingNoShowHostState = (bookingUid: string, expectedNoShowHost: boolean) => {
  const booking = DB.bookings[bookingUid];
  expect(booking).toBeDefined();
  expect(booking?.noShowHost).toBe(expectedNoShowHost);
};

type ExpectedAuditData = {
  bookingUid: string;
  source: string;
  actor: { identifiedBy: string; userUuid?: string; email?: string; name?: null };
  organizationId: number | null;
  host?: { userUuid: string; noShow: { old: boolean | null; new: boolean } };
  attendeesNoShow?: Array<{ attendeeEmail: string; noShow: { old: boolean | null; new: boolean } }>;
};

const expectNoShowBookingAudit = (expected: ExpectedAuditData) => {
  expect(mockOnNoShowUpdated).toHaveBeenCalledTimes(1);
  const call = mockOnNoShowUpdated.mock.calls[0][0];

  expect(call.bookingUid).toBe(expected.bookingUid);
  expect(call.source).toBe(expected.source);
  expect(call.actor).toMatchObject(expected.actor);
  expect(call.organizationId).toBe(expected.organizationId);

  if (expected.host) {
    expect(call.auditData.host).toEqual(expected.host);
  }

  if (expected.attendeesNoShow) {
    expect(call.auditData.attendeesNoShow).toHaveLength(expected.attendeesNoShow.length);

    for (const expectedAttendee of expected.attendeesNoShow) {
      const actualAttendee = call.auditData.attendeesNoShow.find(
        (a: { attendeeEmail: string }) => a.attendeeEmail === expectedAttendee.attendeeEmail
      );
      expect(actualAttendee).toBeDefined();
      expect(actualAttendee.noShow).toEqual(expectedAttendee.noShow);
    }
  }
};

describe("handleMarkNoShow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDB();

    mockFindByUidIncludeEventTypeAttendeesAndUser.mockImplementation(({ bookingUid }) => {
      const booking = DB.bookings[bookingUid];
      if (!booking) return Promise.resolve(null);
      const attendees = DB.attendees[bookingUid] ?? [];
      return Promise.resolve({
        ...booking,
        attendees,
      });
    });

    mockFindByUidIncludeEventTypeAndReferences.mockImplementation(({ bookingUid }) => {
      const booking = DB.bookings[bookingUid];
      if (!booking) throw new Error("Booking not found");
      const attendees = DB.attendees[bookingUid] ?? [];
      return Promise.resolve({
        ...booking,
        attendees: attendees.map((a) => ({ ...a })),
      });
    });

    mockPrismaAttendeeFindMany.mockImplementation(({ where }) => {
      const bookingUid = where?.AND?.[0]?.booking?.uid ?? where?.booking?.uid;
      const emails = where?.AND?.[0]?.email?.in ?? where?.email?.in ?? [];
      const attendees = DB.attendees[bookingUid] ?? [];
      const filteredAttendees = attendees.filter((a) => emails.includes(a.email)).map((a) => ({ ...a }));
      return Promise.resolve(filteredAttendees);
    });

    mockPrismaAttendeeUpdate.mockImplementation(({ where, data }) => {
      for (const bookingUid of Object.keys(DB.attendees)) {
        const attendee = DB.attendees[bookingUid].find((a) => a.id === where.id);
        if (attendee) {
          attendee.noShow = data.noShow;
          return Promise.resolve({ ...attendee, noShow: data.noShow });
        }
      }
      return Promise.resolve(null);
    });

    mockPrismaBookingUpdate.mockImplementation(({ where, data }) => {
      const booking = DB.bookings[where.uid];
      if (booking && data.noShowHost !== undefined) {
        booking.noShowHost = data.noShowHost;
      }
      return Promise.resolve({ uid: where.uid, noShowHost: data.noShowHost });
    });

    mockFindByBookingUidAndEmails.mockImplementation(
      ({ bookingUid, emails }: { bookingUid: string; emails: string[] }) => {
        const attendees = DB.attendees[bookingUid] ?? [];
        return Promise.resolve(attendees.filter((a) => emails.includes(a.email)).map((a) => ({ ...a })));
      }
    );

    mockFindIdAndEmailByBookingUidAndEmails.mockImplementation(
      ({ bookingUid, emails }: { bookingUid: string; emails: string[] }) => {
        const attendees = DB.attendees[bookingUid] ?? [];
        return Promise.resolve(
          attendees.filter((a) => emails.includes(a.email)).map((a) => ({ id: a.id, email: a.email }))
        );
      }
    );

    mockUpdateNoShow.mockImplementation(
      ({
        where: { attendeeId },
        data: { noShow },
      }: {
        where: { attendeeId: number };
        data: { noShow: boolean };
      }) => {
        for (const bookingUid of Object.keys(DB.attendees)) {
          const attendee = DB.attendees[bookingUid].find((a) => a.id === attendeeId);
          if (attendee) {
            attendee.noShow = noShow;
            return Promise.resolve({ noShow, email: attendee.email });
          }
        }
        return Promise.resolve(null);
      }
    );

    mockUpdateNoShowHost.mockImplementation(
      ({ bookingUid, noShowHost }: { bookingUid: string; noShowHost: boolean }) => {
        const booking = DB.bookings[bookingUid];
        if (booking) {
          booking.noShowHost = noShowHost;
        }
        return Promise.resolve({ id: booking?.id ?? 1 });
      }
    );

    mockDoesUserIdHaveAccessToBooking.mockResolvedValue(true);

    mockWebhookServiceInit.mockResolvedValue({ sendPayload: mockSendPayload });
    mockSendPayload.mockResolvedValue(undefined);

    mockOnNoShowUpdated.mockResolvedValue(undefined);
  });

  describe("Core Functionality", () => {
    it("should mark single attendee as no-show", async () => {
      const bookingUid = "test-booking-1";
      createMockBooking({ uid: bookingUid });
      createMockAttendee({ bookingUid, email: "attendee@example.com", noShow: false });

      const result = await handleMarkNoShow({
        bookingUid,
        attendees: [{ email: "attendee@example.com", noShow: true }],
        userId: 123,
        actor: makeUserActor("user-uuid-123"),
        actionSource: "WEBAPP",
      });

      expect(result.attendees).toHaveLength(1);
      expect(result.attendees[0]).toEqual({ email: "attendee@example.com", noShow: true });
      expectAttendeeNoShowState(bookingUid, "attendee@example.com", true);
    });

    it("should mark multiple attendees as no-show", async () => {
      const bookingUid = "test-booking-2";
      createMockBooking({ uid: bookingUid });
      createMockAttendee({ bookingUid, email: "attendee1@example.com", noShow: false });
      createMockAttendee({ bookingUid, email: "attendee2@example.com", noShow: false });

      const result = await handleMarkNoShow({
        bookingUid,
        attendees: [
          { email: "attendee1@example.com", noShow: true },
          { email: "attendee2@example.com", noShow: true },
        ],
        userId: 123,
        actor: makeUserActor("user-uuid-123"),
        actionSource: "WEBAPP",
      });

      expect(result.attendees).toHaveLength(2);
      expectAttendeeNoShowState(bookingUid, "attendee1@example.com", true);
      expectAttendeeNoShowState(bookingUid, "attendee2@example.com", true);
    });

    it("should unmark attendee from no-show", async () => {
      const bookingUid = "test-booking-3";
      createMockBooking({ uid: bookingUid });
      createMockAttendee({ bookingUid, email: "attendee@example.com", noShow: true });

      const result = await handleMarkNoShow({
        bookingUid,
        attendees: [{ email: "attendee@example.com", noShow: false }],
        userId: 123,
        actor: makeUserActor("user-uuid-123"),
        actionSource: "WEBAPP",
      });

      expect(result.attendees[0]).toEqual({ email: "attendee@example.com", noShow: false });
    });

    it("should mark host as no-show", async () => {
      const bookingUid = "test-booking-4";
      createMockBooking({ uid: bookingUid });

      const result = await handleMarkNoShow({
        bookingUid,
        noShowHost: true,
        actor: makeUserActor("user-uuid-123"),
        actionSource: "WEBAPP",
      });

      expect(result.noShowHost).toBe(true);
      expectBookingNoShowHostState(bookingUid, true);
    });

    it("should fire audit event when unmarking host as no-show", async () => {
      const bookingUid = "test-booking-unmark-host";
      createMockBooking({ uid: bookingUid, noShowHost: true });

      const result = await handleMarkNoShow({
        bookingUid,
        noShowHost: false,
        actor: makeUserActor("user-uuid-123"),
        actionSource: "WEBAPP",
      });

      expect(result.noShowHost).toBe(false);
      expect(mockOnNoShowUpdated).toHaveBeenCalledTimes(1);
      const call = mockOnNoShowUpdated.mock.calls[0][0];
      expect(call.auditData.host).toEqual({
        userUuid: "host-uuid-123",
        noShow: { old: true, new: false },
      });
      expect(call.source).toBe("WEBAPP");
      expect(call.actor).toEqual({ identifiedBy: "user", userUuid: "user-uuid-123" });
    });

    it("should mark both host and attendees in single call", async () => {
      const bookingUid = "test-booking-5";
      createMockBooking({ uid: bookingUid });
      createMockAttendee({ bookingUid, email: "attendee@example.com", noShow: false });

      const result = await handleMarkNoShow({
        bookingUid,
        attendees: [{ email: "attendee@example.com", noShow: true }],
        noShowHost: true,
        userId: 123,
        actor: makeUserActor("user-uuid-123"),
        actionSource: "WEBAPP",
      });

      expect(result.noShowHost).toBe(true);
      expect(result.attendees).toHaveLength(1);
      expect(result.attendees[0].noShow).toBe(true);
      expectAttendeeNoShowState(bookingUid, "attendee@example.com", true);
    });
  });

  describe("Error Handling", () => {
    it("should throw 404 when booking not found", async () => {
      await expect(
        handleMarkNoShow({
          bookingUid: "non-existent",
          noShowHost: true,
          actor: makeUserActor("user-uuid-123"),
          actionSource: "WEBAPP",
        })
      ).rejects.toThrow(/Failed to update no-show status/);
    });

    it("should throw 403 when user lacks access", async () => {
      const bookingUid = "test-booking-access";
      createMockBooking({ uid: bookingUid });
      createMockAttendee({ bookingUid, email: "attendee@example.com" });
      mockDoesUserIdHaveAccessToBooking.mockResolvedValue(false);

      await expect(
        handleMarkNoShow({
          bookingUid,
          attendees: [{ email: "attendee@example.com", noShow: true }],
          userId: 999,
          actor: makeUserActor("user-uuid-123"),
          actionSource: "WEBAPP",
        })
      ).rejects.toThrow();
    });

    it("should throw 403 when booking hasn't started yet", async () => {
      const bookingUid = "test-future-booking";
      createMockBooking({
        uid: bookingUid,
        startTime: new Date(Date.now() + 3600000),
        endTime: new Date(Date.now() + 7200000),
      });
      createMockAttendee({ bookingUid, email: "attendee@example.com" });

      await expect(
        handleMarkNoShow({
          bookingUid,
          attendees: [{ email: "attendee@example.com", noShow: true }],
          userId: 123,
          actor: makeUserActor("user-uuid-123"),
          actionSource: "WEBAPP",
        })
      ).rejects.toThrow();
    });

    it("should throw 401 when userId not provided for attendee marking", async () => {
      const bookingUid = "test-booking-auth";
      createMockBooking({ uid: bookingUid });
      createMockAttendee({ bookingUid, email: "attendee@example.com" });

      await expect(
        handleMarkNoShow({
          bookingUid,
          attendees: [{ email: "attendee@example.com", noShow: true }],
          actor: makeUserActor("user-uuid-123"),
          actionSource: "WEBAPP",
        })
      ).rejects.toThrow();
    });
  });

  describe("Integrations", () => {
    it("should call WebhookService.sendPayload for attendee updates", async () => {
      const bookingUid = "test-booking-webhook";
      createMockBooking({ uid: bookingUid });
      createMockAttendee({ bookingUid, email: "attendee@example.com" });

      await handleMarkNoShow({
        bookingUid,
        attendees: [{ email: "attendee@example.com", noShow: true }],
        userId: 123,
        actor: makeUserActor("user-uuid-123"),
        actionSource: "WEBAPP",
      });

      expect(mockWebhookServiceInit).toHaveBeenCalled();
      expect(mockSendPayload).toHaveBeenCalledWith(expect.objectContaining({ bookingUid }));
    });

    it("should call BookingEventHandlerService.onNoShowUpdated with correct args", async () => {
      const bookingUid = "test-booking-audit";
      createMockBooking({ uid: bookingUid });
      createMockAttendee({ bookingUid, email: "attendee@example.com", noShow: false });

      await handleMarkNoShow({
        bookingUid,
        attendees: [{ email: "attendee@example.com", noShow: true }],
        userId: 123,
        actor: makeUserActor("user-uuid-123"),
        actionSource: "WEBAPP",
      });

      expectNoShowBookingAudit({
        bookingUid,
        source: "WEBAPP",
        actor: { identifiedBy: "user", userUuid: "user-uuid-123" },
        organizationId: null,
        attendeesNoShow: [{ attendeeEmail: "attendee@example.com", noShow: { old: false, new: true } }],
      });
    });

    it("should include old and new values in audit data for host", async () => {
      const bookingUid = "test-booking-audit-host";
      createMockBooking({ uid: bookingUid, noShowHost: false });

      await handleMarkNoShow({
        bookingUid,
        noShowHost: true,
        actor: makeUserActor("user-uuid-123"),
        actionSource: "WEBAPP",
      });

      expectNoShowBookingAudit({
        bookingUid,
        source: "WEBAPP",
        actor: { identifiedBy: "user", userUuid: "user-uuid-123" },
        organizationId: null,
        host: { userUuid: "host-uuid-123", noShow: { old: false, new: true } },
      });
    });
  });

  describe("Public Route (handleMarkHostNoShow)", () => {
    it("should create guest actor when marking host as no-show via public route", async () => {
      const bookingUid = "test-booking-public-route";
      createMockBooking({ uid: bookingUid });

      const result = await handleMarkHostNoShow({
        bookingUid,
        noShowHost: true,
        actionSource: "WEBAPP",
      });

      expect(result.noShowHost).toBe(true);
      expectBookingNoShowHostState(bookingUid, true);

      expect(mockOnNoShowUpdated).toHaveBeenCalledTimes(1);
      const call = mockOnNoShowUpdated.mock.calls[0][0];
      expect(call.actor.identifiedBy).toBe("guest");
      expect(call.actor.email).toMatch(/@guest\.internal$/);
      expect(call.actor.name).toBeNull();
      expect(call.source).toBe("WEBAPP");
      expect(call.auditData.host).toEqual({
        userUuid: "host-uuid-123",
        noShow: { old: null, new: true },
      });
    });
  });

  describe("Edge Cases", () => {
    it("should only update attendees found in booking", async () => {
      const bookingUid = "test-booking-only-found";
      createMockBooking({ uid: bookingUid });
      createMockAttendee({ bookingUid, email: "attendee1@example.com", noShow: false });
      createMockAttendee({ bookingUid, email: "attendee2@example.com", noShow: false });

      const result = await handleMarkNoShow({
        bookingUid,
        attendees: [{ email: "attendee1@example.com", noShow: true }],
        userId: 123,
        actor: makeUserActor("user-uuid-123"),
        actionSource: "WEBAPP",
      });

      expect(result.attendees).toHaveLength(1);
      expect(result.attendees[0].email).toBe("attendee1@example.com");
      expect(result.attendees[0].noShow).toBe(true);
      expectAttendeeNoShowState(bookingUid, "attendee1@example.com", true);
      expectAttendeeNoShowState(bookingUid, "attendee2@example.com", false);
    });

    it("should gracefully handle non-existent attendee emails", async () => {
      const bookingUid = "test-booking-non-existent-attendee";
      createMockBooking({ uid: bookingUid });
      createMockAttendee({ bookingUid, email: "attendee1@example.com", noShow: false });

      const result = await handleMarkNoShow({
        bookingUid,
        attendees: [
          { email: "attendee1@example.com", noShow: true },
          { email: "non-existent@example.com", noShow: true },
        ],
        userId: 123,
        actor: makeUserActor("user-uuid-123"),
        actionSource: "WEBAPP",
      });

      expect(result.attendees).toHaveLength(1);
      expect(result.attendees[0].email).toBe("attendee1@example.com");
      expect(result.attendees[0].noShow).toBe(true);
      expectAttendeeNoShowState(bookingUid, "attendee1@example.com", true);
    });

    it("should only audit successfully updated attendees, not failed ones", async () => {
      const bookingUid = "test-booking-audit-only-successful";
      createMockBooking({ uid: bookingUid });
      const attendee1 = createMockAttendee({ bookingUid, email: "attendee1@example.com", noShow: false });
      const attendee2 = createMockAttendee({ bookingUid, email: "attendee2@example.com", noShow: false });
      const attendee3 = createMockAttendee({ bookingUid, email: "attendee3@example.com", noShow: false });

      // Mock updateNoShow to fail for attendee2
      mockUpdateNoShow.mockImplementation(
        ({
          where: { attendeeId },
          data: { noShow },
        }: {
          where: { attendeeId: number };
          data: { noShow: boolean };
        }) => {
          // Simulate database error for attendee2
          if (attendeeId === attendee2.id) {
            return Promise.reject(new Error("Database error"));
          }

          for (const bookingUid of Object.keys(DB.attendees)) {
            const attendee = DB.attendees[bookingUid].find((a) => a.id === attendeeId);
            if (attendee) {
              attendee.noShow = noShow;
              return Promise.resolve({ noShow, email: attendee.email });
            }
          }
          return Promise.resolve(null);
        }
      );

      await handleMarkNoShow({
        bookingUid,
        attendees: [
          { email: "attendee1@example.com", noShow: true },
          { email: "attendee2@example.com", noShow: true }, // This will fail
          { email: "attendee3@example.com", noShow: true },
        ],
        userId: 123,
        actor: makeUserActor("user-uuid-123"),
        actionSource: "WEBAPP",
      });

      // Audit should only contain attendee1 and attendee3, not attendee2
      expectNoShowBookingAudit({
        bookingUid,
        source: "WEBAPP",
        actor: { identifiedBy: "user", userUuid: "user-uuid-123" },
        organizationId: null,
        attendeesNoShow: [
          { attendeeEmail: "attendee1@example.com", noShow: { old: false, new: true } },
          { attendeeEmail: "attendee3@example.com", noShow: { old: false, new: true } },
        ],
      });

      const call = mockOnNoShowUpdated.mock.calls[0][0];
      expect(call.auditData.attendeesNoShow).toHaveLength(2);
      expect(call.auditData.attendeesNoShow.map((a: { attendeeEmail: string }) => a.attendeeEmail)).not.toContain(
        "attendee2@example.com"
      );
    });

    it("should not fire audit event when nothing changed", async () => {
      const bookingUid = "test-booking-no-change";
      createMockBooking({ uid: bookingUid });

      await handleMarkNoShow({
        bookingUid,
        actor: makeUserActor("user-uuid-123"),
        actionSource: "WEBAPP",
      });

      expect(mockOnNoShowUpdated).not.toHaveBeenCalled();
    });

    it("should handle booking without eventType", async () => {
      const bookingUid = "test-booking-no-event-type";
      createMockBooking({ uid: bookingUid, hasEventType: false });

      const result = await handleMarkNoShow({
        bookingUid,
        noShowHost: true,
        actor: makeUserActor("user-uuid-123"),
        actionSource: "WEBAPP",
      });

      expect(result.noShowHost).toBe(true);
    });
  });
});
