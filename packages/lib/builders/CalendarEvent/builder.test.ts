import type { CalendarEvent } from "@calcom/types/Calendar";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarEventBuilder } from "./builder";

vi.mock("@calcom/prisma", () => ({
  default: {
    eventType: { findUniqueOrThrow: vi.fn() },
    user: { findUniqueOrThrow: vi.fn() },
  },
}));

vi.mock("@calcom/lib/CalEventParser", () => ({
  getRescheduleLink: vi.fn().mockReturnValue("https://cal.com/reschedule/mock-uid"),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue(((key: string) => key) as unknown),
}));

vi.mock("short-uuid", () => ({
  default: () => ({
    fromUUID: vi.fn().mockReturnValue("mock-short-uid"),
  }),
}));

vi.mock("uuid", () => ({
  v5: Object.assign(vi.fn().mockReturnValue("mock-uuid-v5"), { URL: "6ba7b811-9dad-11d1-80b4-00c04fd430c8" }),
}));

const createMockUser = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  email: "organizer@example.com",
  name: "Organizer",
  username: "organizer",
  timeZone: "America/New_York",
  credentials: [],
  bufferTime: 0,
  destinationCalendar: null,
  locale: "en",
  ...overrides,
});

describe("CalendarEventBuilder", () => {
  let builder: CalendarEventBuilder;

  beforeEach(() => {
    vi.clearAllMocks();
    builder = new CalendarEventBuilder();
  });

  describe("constructor and reset", () => {
    it("initializes with a fresh CalendarEventClass instance", () => {
      expect(builder.calendarEvent).toBeDefined();
      expect(builder.calendarEvent.title).toBeUndefined();
    });

    it("has empty attendeesList and teamMembers arrays", () => {
      expect(builder.attendeesList).toEqual([]);
      expect(builder.teamMembers).toEqual([]);
    });
  });

  describe("init", () => {
    it("re-initializes calendarEvent with provided props", () => {
      const props = {
        type: "30min",
        title: "Init Test",
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T10:30:00.000Z",
        organizer: {
          name: "Org",
          email: "org@example.com",
          timeZone: "UTC",
          language: {
            translate: ((k: string) => k) as unknown as CalendarEvent["organizer"]["language"]["translate"],
            locale: "en",
          },
        },
        attendees: [],
      } as CalendarEvent;

      builder.init(props);

      expect(builder.calendarEvent.title).toBe("Init Test");
      expect(builder.calendarEvent.type).toBe("30min");
    });
  });

  describe("simple setters", () => {
    it("setLocation sets calendarEvent.location", () => {
      builder.setLocation("https://meet.google.com/test");
      expect(builder.calendarEvent.location).toBe("https://meet.google.com/test");
    });

    it("setUId sets calendarEvent.uid", () => {
      builder.setUId("test-uid-123");
      expect(builder.calendarEvent.uid).toBe("test-uid-123");
    });

    it("setDescription sets calendarEvent.description", () => {
      builder.setDescription("A test description");
      expect(builder.calendarEvent.description).toBe("A test description");
    });

    it("setNotes sets calendarEvent.additionalNotes", () => {
      builder.setNotes("Some additional notes");
      expect(builder.calendarEvent.additionalNotes).toBe("Some additional notes");
    });

    it("setCancellationReason sets calendarEvent.cancellationReason", () => {
      builder.setCancellationReason("Schedule conflict");
      expect(builder.calendarEvent.cancellationReason).toBe("Schedule conflict");
    });

    it("setDestinationCalendar sets calendarEvent.destinationCalendar", () => {
      const destCal = [
        {
          id: 1,
          integration: "google_calendar",
          externalId: "primary",
          primaryEmail: "user@gmail.com",
          userId: 1,
          eventTypeId: null,
          credentialId: 1,
          delegationCredentialId: null,
        },
      ];
      builder.setDestinationCalendar(destCal);
      expect(builder.calendarEvent.destinationCalendar).toEqual(destCal);
    });

    it("setHideCalendarNotes sets calendarEvent.hideCalendarNotes", () => {
      builder.setHideCalendarNotes(true);
      expect(builder.calendarEvent.hideCalendarNotes).toBe(true);
    });

    it("setHideCalendarEventDetails sets calendarEvent.hideCalendarEventDetails", () => {
      builder.setHideCalendarEventDetails(true);
      expect(builder.calendarEvent.hideCalendarEventDetails).toBe(true);
    });

    it("setUsers sets users array", () => {
      const users = [createMockUser()];
      builder.setUsers(users as Parameters<CalendarEventBuilder["setUsers"]>[0]);
      expect(builder.users).toHaveLength(1);
      expect(builder.users[0].email).toBe("organizer@example.com");
    });
  });

  describe("buildAttendeesList", () => {
    it("combines calendarEvent.attendees with teamMembers", () => {
      builder.calendarEvent.attendees = [
        {
          name: "Attendee",
          email: "attendee@example.com",
          timeZone: "UTC",
          language: {
            translate: ((k: string) => k) as unknown as CalendarEvent["organizer"]["language"]["translate"],
            locale: "en",
          },
        },
      ];
      builder.teamMembers = [
        {
          id: 2,
          email: "team@example.com",
          name: "Team Member",
          locale: "en",
          timeZone: "UTC",
          username: "teammember",
          language: {
            translate: ((k: string) => k) as unknown as CalendarEvent["organizer"]["language"]["translate"],
            locale: "en",
          },
        },
      ];

      builder.buildAttendeesList();

      expect(builder.attendeesList).toHaveLength(2);
    });

    it("returns empty list when no attendees or team members", () => {
      builder.calendarEvent.attendees = [];
      builder.teamMembers = [];

      builder.buildAttendeesList();

      expect(builder.attendeesList).toHaveLength(0);
    });
  });

  describe("buildUIDCalendarEvent", () => {
    it("generates a UID from organizer username and start time", () => {
      builder.setUsers([createMockUser()] as Parameters<CalendarEventBuilder["setUsers"]>[0]);
      builder.calendarEvent.startTime = "2026-01-01T10:00:00.000Z";

      builder.buildUIDCalendarEvent();

      expect(builder.calendarEvent.uid).toBe("mock-short-uid");
    });

    it("throws if users array is empty", () => {
      builder.setUsers([] as Parameters<CalendarEventBuilder["setUsers"]>[0]);

      expect(() => builder.buildUIDCalendarEvent()).toThrow("call buildUsers before calling this function");
    });

    it("throws if organizer has no username", () => {
      builder.setUsers([createMockUser({ username: null })] as Parameters<
        CalendarEventBuilder["setUsers"]
      >[0]);

      expect(() => builder.buildUIDCalendarEvent()).toThrow("Organizer username is required");
    });
  });

  describe("buildRescheduleLink", () => {
    it("builds reschedule link from calendarEvent", () => {
      builder.buildRescheduleLink();

      expect(builder.rescheduleLink).toBe("https://cal.com/reschedule/mock-uid");
    });

    it("wraps errors with descriptive message", async () => {
      const { getRescheduleLink } = vi.mocked(await import("@calcom/lib/CalEventParser"));
      getRescheduleLink.mockImplementationOnce(() => {
        throw new Error("missing uid");
      });

      expect(() => builder.buildRescheduleLink()).toThrow("buildRescheduleLink.error: missing uid");
    });
  });

  describe("buildEventObjectFromInnerClass", () => {
    it("calls prisma to fetch event type by ID and sets this.eventType", async () => {
      const mockEventType = {
        id: 1,
        users: [createMockUser()],
        team: null,
        description: "Test",
        slug: "test",
        teamId: null,
        title: "Test Event",
        length: 30,
        eventName: null,
        schedulingType: null,
        periodType: "UNLIMITED",
        periodStartDate: null,
        periodEndDate: null,
        periodDays: null,
        periodCountCalendarDays: null,
        requiresConfirmation: false,
        userId: 1,
        price: 0,
        currency: "usd",
        metadata: {},
        destinationCalendar: null,
        hideCalendarNotes: false,
        hideCalendarEventDetails: false,
        disableCancelling: false,
        disableRescheduling: false,
      };
      const prisma = (await import("@calcom/prisma")).default;
      vi.mocked(prisma.eventType.findUniqueOrThrow).mockResolvedValueOnce(mockEventType as never);

      await builder.buildEventObjectFromInnerClass(1);

      expect(builder.eventType).toBeDefined();
      expect(prisma.eventType.findUniqueOrThrow).toHaveBeenCalled();
    });

    it("handles prisma error by throwing descriptive error", async () => {
      const prisma = (await import("@calcom/prisma")).default;
      vi.mocked(prisma.eventType.findUniqueOrThrow).mockRejectedValueOnce(new Error("Not found"));

      await expect(builder.buildEventObjectFromInnerClass(999)).rejects.toThrow(
        "Error while getting eventType"
      );
    });
  });

  describe("buildUsersFromInnerClass", () => {
    it("throws if eventType is not set", async () => {
      await expect(builder.buildUsersFromInnerClass()).rejects.toThrow(
        "exec BuildEventObjectFromInnerClass before calling this function"
      );
    });

    it("uses eventType.users when available", async () => {
      const mockUser = createMockUser();
      builder.eventType = {
        id: 1,
        users: [mockUser],
        userId: 1,
      } as CalendarEventBuilder["eventType"];

      await builder.buildUsersFromInnerClass();

      expect(builder.users).toHaveLength(1);
      expect(builder.users[0].email).toBe("organizer@example.com");
    });

    it("falls back to fetching user by eventType.userId when users array is empty", async () => {
      const mockUser = createMockUser();
      builder.eventType = {
        id: 1,
        users: [],
        userId: 1,
      } as CalendarEventBuilder["eventType"];

      const prisma = (await import("@calcom/prisma")).default;
      vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValueOnce(mockUser as never);

      await builder.buildUsersFromInnerClass();

      expect(builder.users).toHaveLength(1);
    });
  });

  describe("buildTeamMembers", () => {
    it("builds team members from users[1:] with translations", async () => {
      const users = [
        createMockUser({ id: 1, username: "organizer" }),
        createMockUser({ id: 2, username: "member1", email: "member1@example.com", locale: "en" }),
      ];
      builder.setUsers(users as Parameters<CalendarEventBuilder["setUsers"]>[0]);

      await builder.buildTeamMembers();

      expect(builder.teamMembers).toHaveLength(1);
      expect(builder.teamMembers[0].email).toBe("member1@example.com");
      expect(builder.teamMembers[0].language).toBeDefined();
    });

    it("returns empty array when no users", async () => {
      builder.setUsers([] as Parameters<CalendarEventBuilder["setUsers"]>[0]);

      await builder.buildTeamMembers();

      expect(builder.teamMembers).toEqual([]);
    });
  });

  describe("setUsersFromId", () => {
    it("fetches user by ID and sets users array", async () => {
      const mockUser = createMockUser();
      const prisma = (await import("@calcom/prisma")).default;
      vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValueOnce(mockUser as never);

      await builder.setUsersFromId(1);

      expect(builder.users).toHaveLength(1);
      expect(builder.users[0].email).toBe("organizer@example.com");
    });

    it("throws if user not found", async () => {
      const prisma = (await import("@calcom/prisma")).default;
      vi.mocked(prisma.user.findUniqueOrThrow).mockRejectedValueOnce(new Error("Not found"));

      await expect(builder.setUsersFromId(999)).rejects.toThrow("getUsersById.users.notFound");
    });
  });
});
