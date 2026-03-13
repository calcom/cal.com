jest.mock(
  "@calcom/platform-libraries/app-store",
  () => ({
    DelegationCredentialRepository: {
      findByIdIncludeSensitiveServiceAccountKey: jest.fn().mockResolvedValue(null),
    },
    OAuth2UniversalSchema: { parse: jest.fn((v: unknown) => v) },
  }),
  { virtual: true }
);
jest.mock(
  "@calcom/platform-libraries",
  () => ({
    getBusyCalendarTimes: jest.fn(),
    getConnectedDestinationCalendarsAndEnsureDefaultsInDb: jest.fn(),
    credentialForCalendarServiceSelect: {},
  }),
  { virtual: true }
);

import { GOOGLE_CALENDAR, SUCCESS_STATUS } from "@calcom/platform-constants";
import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { CalUnifiedCalendarsController } from "./cal-unified-calendars.controller";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { GoogleCalendarService } from "@/modules/cal-unified-calendars/services/google-calendar.service";
import { UnifiedCalendarsFreebusyService } from "@/modules/cal-unified-calendars/services/unified-calendars-freebusy.service";

describe("CalUnifiedCalendarsController", () => {
  let controller: CalUnifiedCalendarsController;
  let mockGoogleCalendarService: Record<string, jest.Mock>;
  let mockFreebusyService: Record<string, jest.Mock>;

  const userId = 42;

  beforeEach(async () => {
    mockGoogleCalendarService = {
      getEventDetails: jest.fn(),
      updateEventDetails: jest.fn(),
      listEventsForUser: jest.fn(),
      createEventForUser: jest.fn(),
      deleteEventForUser: jest.fn(),
      listEventsForUserByConnectionId: jest.fn(),
      createEventForUserByConnectionId: jest.fn(),
      getEventByConnectionId: jest.fn(),
      updateEventByConnectionId: jest.fn(),
      deleteEventForUserByConnectionId: jest.fn(),
    };

    mockFreebusyService = {
      getConnections: jest.fn(),
      getBusyTimesForConnection: jest.fn(),
      getBusyTimesForGoogleCalendars: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalUnifiedCalendarsController],
      providers: [
        { provide: GoogleCalendarService, useValue: mockGoogleCalendarService },
        { provide: UnifiedCalendarsFreebusyService, useValue: mockFreebusyService },
      ],
    })
      .overrideGuard(ApiAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CalUnifiedCalendarsController>(CalUnifiedCalendarsController);
  });

  describe("listConnections", () => {
    it("should return connections from freebusy service", async () => {
      const connections = [
        { connectionId: "1", type: "google" as const, email: "user@gmail.com" },
        { connectionId: "2", type: "office365" as const, email: "user@outlook.com" },
      ];
      mockFreebusyService.getConnections.mockResolvedValue(connections);

      const result = await controller.listConnections(userId);

      expect(result.status).toBe(SUCCESS_STATUS);
      expect(result.data.connections).toEqual(connections);
      expect(mockFreebusyService.getConnections).toHaveBeenCalledWith(userId);
    });

    it("should return empty connections array when user has no calendars", async () => {
      mockFreebusyService.getConnections.mockResolvedValue([]);

      const result = await controller.listConnections(userId);

      expect(result.status).toBe(SUCCESS_STATUS);
      expect(result.data.connections).toEqual([]);
    });

    it("should never expose credential key in connection list response", async () => {
      const connections = [
        { connectionId: "1", type: "google" as const, email: "user@gmail.com" },
      ];
      mockFreebusyService.getConnections.mockResolvedValue(connections);

      const result = await controller.listConnections(userId);

      expect(result.data.connections.every((c) => !Object.prototype.hasOwnProperty.call(c, "key"))).toBe(
        true
      );
      expect(JSON.stringify(result)).not.toMatch(/"key"\s*:/);
    });
  });

  describe("listConnectionEvents", () => {
    it("should list events for a valid connection", async () => {
      const mockEvents = [
        {
          id: "event-1",
          status: "confirmed",
          summary: "Meeting",
          start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "UTC" },
          end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "UTC" },
          organizer: { email: "user@gmail.com" },
        },
      ];
      mockGoogleCalendarService.listEventsForUserByConnectionId.mockResolvedValue(mockEvents);

      const result = await controller.listConnectionEvents("10", userId, {
        from: "2024-01-01",
        to: "2024-01-31",
      });

      expect(result.status).toBe(SUCCESS_STATUS);
      expect(result.data).toHaveLength(1);
      expect(mockGoogleCalendarService.listEventsForUserByConnectionId).toHaveBeenCalledWith(
        userId,
        10,
        "primary",
        "2024-01-01T00:00:00.000Z",
        "2024-01-31T23:59:59.999Z"
      );
    });

    it("should throw BadRequestException for invalid connectionId", async () => {
      await expect(
        controller.listConnectionEvents("invalid", userId, {
          from: "2024-01-01",
          to: "2024-01-31",
        })
      ).rejects.toThrow(BadRequestException);
    });

    it("should pass ISO datetime strings directly without modification", async () => {
      mockGoogleCalendarService.listEventsForUserByConnectionId.mockResolvedValue([]);

      await controller.listConnectionEvents("10", userId, {
        from: "2024-01-01T09:00:00Z",
        to: "2024-01-31T17:00:00Z",
      });

      expect(mockGoogleCalendarService.listEventsForUserByConnectionId).toHaveBeenCalledWith(
        userId,
        10,
        "primary",
        "2024-01-01T09:00:00Z",
        "2024-01-31T17:00:00Z"
      );
    });

    it("should use provided calendarId when specified", async () => {
      mockGoogleCalendarService.listEventsForUserByConnectionId.mockResolvedValue([]);

      await controller.listConnectionEvents("10", userId, {
        from: "2024-01-01",
        to: "2024-01-31",
        calendarId: "custom@group.calendar.google.com",
      });

      expect(mockGoogleCalendarService.listEventsForUserByConnectionId).toHaveBeenCalledWith(
        userId,
        10,
        "custom@group.calendar.google.com",
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe("createConnectionEvent", () => {
    const body = {
      title: "New Event",
      start: { time: "2024-01-15T10:00:00Z", timeZone: "America/New_York" },
      end: { time: "2024-01-15T11:00:00Z", timeZone: "America/New_York" },
    };

    it("should create event for a valid connection", async () => {
      const mockEvent = {
        id: "new-event-id",
        status: "confirmed",
        summary: "New Event",
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "America/New_York" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "America/New_York" },
        organizer: { email: "user@gmail.com" },
      };
      mockGoogleCalendarService.createEventForUserByConnectionId.mockResolvedValue(mockEvent);

      const result = await controller.createConnectionEvent("10", userId, body);

      expect(result.status).toBe(SUCCESS_STATUS);
      expect(result.data).toBeDefined();
      expect(mockGoogleCalendarService.createEventForUserByConnectionId).toHaveBeenCalledWith(
        userId,
        10,
        "primary",
        body
      );
    });

    it("should throw BadRequestException for invalid connectionId", async () => {
      await expect(controller.createConnectionEvent("abc", userId, body)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should use custom calendarId when provided", async () => {
      const mockEvent = {
        id: "new-event-id",
        status: "confirmed",
        summary: "New Event",
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "America/New_York" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "America/New_York" },
        organizer: { email: "user@gmail.com" },
      };
      mockGoogleCalendarService.createEventForUserByConnectionId.mockResolvedValue(mockEvent);

      await controller.createConnectionEvent(
        "10",
        userId,
        body,
        "custom@group.calendar.google.com"
      );

      expect(mockGoogleCalendarService.createEventForUserByConnectionId).toHaveBeenCalledWith(
        userId,
        10,
        "custom@group.calendar.google.com",
        body
      );
    });
  });

  describe("getConnectionEvent", () => {
    it("should get a single event by ID", async () => {
      const mockEvent = {
        id: "event-1",
        status: "confirmed",
        summary: "Test",
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "UTC" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "UTC" },
        organizer: { email: "user@gmail.com" },
      };
      mockGoogleCalendarService.getEventByConnectionId.mockResolvedValue(mockEvent);

      const result = await controller.getConnectionEvent("10", "event-1", userId);

      expect(result.status).toBe(SUCCESS_STATUS);
      expect(mockGoogleCalendarService.getEventByConnectionId).toHaveBeenCalledWith(
        userId,
        10,
        "primary",
        "event-1"
      );
    });

    it("should throw BadRequestException for invalid connectionId", async () => {
      await expect(controller.getConnectionEvent("bad", "event-1", userId)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should use custom calendarId when provided", async () => {
      mockGoogleCalendarService.getEventByConnectionId.mockResolvedValue({
        id: "e",
        start: { dateTime: "2024-01-15T10:00:00Z" },
        end: { dateTime: "2024-01-15T11:00:00Z" },
        organizer: { email: "user@gmail.com" },
      });

      await controller.getConnectionEvent("10", "event-1", userId, "custom@calendar");

      expect(mockGoogleCalendarService.getEventByConnectionId).toHaveBeenCalledWith(
        userId,
        10,
        "custom@calendar",
        "event-1"
      );
    });

    it("should never expose credential key in event response", async () => {
      const mockEvent = {
        id: "event-1",
        status: "confirmed",
        summary: "Test",
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "UTC" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "UTC" },
        organizer: { email: "user@gmail.com" },
      };
      mockGoogleCalendarService.getEventByConnectionId.mockResolvedValue(mockEvent);

      const result = await controller.getConnectionEvent("10", "event-1", userId);

      expect(Object.prototype.hasOwnProperty.call(result.data, "key")).toBe(false);
      expect(JSON.stringify(result)).not.toMatch(/"key"\s*:/);
    });
  });

  describe("updateConnectionEvent", () => {
    it("should update event for a valid connection", async () => {
      const updateData = { title: "Updated Title" };
      const mockEvent = {
        id: "event-1",
        summary: "Updated Title",
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "UTC" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "UTC" },
        organizer: { email: "user@gmail.com" },
      };
      mockGoogleCalendarService.updateEventByConnectionId.mockResolvedValue(mockEvent);

      const result = await controller.updateConnectionEvent("10", "event-1", userId, updateData);

      expect(result.status).toBe(SUCCESS_STATUS);
      expect(mockGoogleCalendarService.updateEventByConnectionId).toHaveBeenCalledWith(
        userId,
        10,
        "primary",
        "event-1",
        updateData
      );
    });

    it("should throw BadRequestException for invalid connectionId", async () => {
      await expect(
        controller.updateConnectionEvent("NaN", "event-1", userId, { title: "t" })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("deleteConnectionEvent", () => {
    it("should delete event for a valid connection", async () => {
      mockGoogleCalendarService.deleteEventForUserByConnectionId.mockResolvedValue(undefined);

      await controller.deleteConnectionEvent("10", "event-1", userId);

      expect(mockGoogleCalendarService.deleteEventForUserByConnectionId).toHaveBeenCalledWith(
        userId,
        10,
        "primary",
        "event-1"
      );
    });

    it("should throw BadRequestException for invalid connectionId", async () => {
      await expect(controller.deleteConnectionEvent("x", "event-1", userId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("getConnectionFreeBusy", () => {
    it("should return busy times for a connection", async () => {
      const busyData = [{ start: new Date("2024-01-15T10:00:00Z"), end: new Date("2024-01-15T11:00:00Z") }];
      mockFreebusyService.getBusyTimesForConnection.mockResolvedValue(busyData);

      const result = await controller.getConnectionFreeBusy("10", userId, {
        from: "2024-01-01T00:00:00Z",
        to: "2024-01-31T23:59:59Z",
        timeZone: "America/New_York",
      });

      expect(result.status).toBe(SUCCESS_STATUS);
      expect(result.data).toEqual(busyData);
      expect(mockFreebusyService.getBusyTimesForConnection).toHaveBeenCalledWith(
        userId,
        10,
        "2024-01-01T00:00:00Z",
        "2024-01-31T23:59:59Z",
        "America/New_York"
      );
    });

    it("should default timezone to UTC when not provided", async () => {
      mockFreebusyService.getBusyTimesForConnection.mockResolvedValue([]);

      await controller.getConnectionFreeBusy("10", userId, {
        from: "2024-01-01T00:00:00Z",
        to: "2024-01-31T23:59:59Z",
      });

      expect(mockFreebusyService.getBusyTimesForConnection).toHaveBeenCalledWith(
        userId,
        10,
        "2024-01-01T00:00:00Z",
        "2024-01-31T23:59:59Z",
        "UTC"
      );
    });

    it("should throw BadRequestException for invalid connectionId", async () => {
      await expect(
        controller.getConnectionFreeBusy("bad", userId, {
          from: "2024-01-01",
          to: "2024-01-31",
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getCalendarEventDetails (legacy)", () => {
    it("should return event details for Google Calendar", async () => {
      const mockEvent = {
        id: "event-uid",
        status: "confirmed",
        summary: "Test Meeting",
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "UTC" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "UTC" },
        organizer: { email: "user@gmail.com" },
      };
      mockGoogleCalendarService.getEventDetails.mockResolvedValue(mockEvent);

      const result = await controller.getCalendarEventDetails(GOOGLE_CALENDAR, "event-uid");

      expect(result.status).toBe(SUCCESS_STATUS);
      expect(result.data).toBeDefined();
      expect(mockGoogleCalendarService.getEventDetails).toHaveBeenCalledWith("event-uid");
    });

    it("should throw BadRequestException for non-Google calendar", async () => {
      await expect(controller.getCalendarEventDetails("office365", "event-uid")).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("updateCalendarEvent (legacy)", () => {
    it("should update event for Google Calendar", async () => {
      const updateData = { title: "Updated" };
      const mockEvent = {
        id: "event-uid",
        summary: "Updated",
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "UTC" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "UTC" },
        organizer: { email: "user@gmail.com" },
      };
      mockGoogleCalendarService.updateEventDetails.mockResolvedValue(mockEvent);

      const result = await controller.updateCalendarEvent(GOOGLE_CALENDAR, "event-uid", updateData);

      expect(result.status).toBe(SUCCESS_STATUS);
      expect(mockGoogleCalendarService.updateEventDetails).toHaveBeenCalledWith("event-uid", updateData);
    });

    it("should throw BadRequestException for non-Google calendar", async () => {
      await expect(controller.updateCalendarEvent("office365", "event-uid", { title: "t" })).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("listCalendarEvents (legacy)", () => {
    it("should list events for Google Calendar", async () => {
      mockGoogleCalendarService.listEventsForUser.mockResolvedValue([]);

      const result = await controller.listCalendarEvents(GOOGLE_CALENDAR, userId, {
        from: "2024-01-01",
        to: "2024-01-31",
      });

      expect(result.status).toBe(SUCCESS_STATUS);
      expect(result.data).toEqual([]);
    });

    it("should throw BadRequestException for non-Google calendar", async () => {
      await expect(
        controller.listCalendarEvents("office365", userId, {
          from: "2024-01-01",
          to: "2024-01-31",
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("createCalendarEvent (legacy)", () => {
    const body = {
      title: "New Event",
      start: { time: "2024-01-15T10:00:00Z", timeZone: "America/New_York" },
      end: { time: "2024-01-15T11:00:00Z", timeZone: "America/New_York" },
    };

    it("should create event for Google Calendar", async () => {
      const mockEvent = {
        id: "new-id",
        summary: "New Event",
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "America/New_York" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "America/New_York" },
        organizer: { email: "user@gmail.com" },
      };
      mockGoogleCalendarService.createEventForUser.mockResolvedValue(mockEvent);

      const result = await controller.createCalendarEvent(GOOGLE_CALENDAR, userId, body);

      expect(result.status).toBe(SUCCESS_STATUS);
      expect(mockGoogleCalendarService.createEventForUser).toHaveBeenCalledWith(userId, "primary", body);
    });

    it("should throw BadRequestException for non-Google calendar", async () => {
      await expect(controller.createCalendarEvent("apple", userId, body)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("deleteCalendarEvent (legacy)", () => {
    it("should delete event for Google Calendar", async () => {
      mockGoogleCalendarService.deleteEventForUser.mockResolvedValue(undefined);

      await controller.deleteCalendarEvent(GOOGLE_CALENDAR, "event-uid", userId);

      expect(mockGoogleCalendarService.deleteEventForUser).toHaveBeenCalledWith(
        userId,
        "primary",
        "event-uid"
      );
    });

    it("should throw BadRequestException for non-Google calendar", async () => {
      await expect(controller.deleteCalendarEvent("office365", "event-uid", userId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("getFreeBusy (legacy)", () => {
    it("should return busy times for Google Calendar", async () => {
      const busyData = [{ start: new Date(), end: new Date() }];
      mockFreebusyService.getBusyTimesForGoogleCalendars.mockResolvedValue(busyData);

      const result = await controller.getFreeBusy(GOOGLE_CALENDAR, userId, {
        from: "2024-01-01T00:00:00Z",
        to: "2024-01-31T23:59:59Z",
        timeZone: "America/New_York",
      });

      expect(result.status).toBe(SUCCESS_STATUS);
      expect(result.data).toEqual(busyData);
      expect(mockFreebusyService.getBusyTimesForGoogleCalendars).toHaveBeenCalledWith(
        userId,
        "2024-01-01T00:00:00Z",
        "2024-01-31T23:59:59Z",
        "America/New_York"
      );
    });

    it("should default timezone to UTC when not provided", async () => {
      mockFreebusyService.getBusyTimesForGoogleCalendars.mockResolvedValue([]);

      await controller.getFreeBusy(GOOGLE_CALENDAR, userId, {
        from: "2024-01-01T00:00:00Z",
        to: "2024-01-31T23:59:59Z",
      });

      expect(mockFreebusyService.getBusyTimesForGoogleCalendars).toHaveBeenCalledWith(
        userId,
        "2024-01-01T00:00:00Z",
        "2024-01-31T23:59:59Z",
        "UTC"
      );
    });

    it("should throw BadRequestException for non-Google calendar", async () => {
      await expect(
        controller.getFreeBusy("office365", userId, {
          from: "2024-01-01",
          to: "2024-01-31",
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
