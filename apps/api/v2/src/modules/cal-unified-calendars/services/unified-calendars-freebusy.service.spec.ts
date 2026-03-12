jest.mock(
  "@calcom/platform-libraries",
  () => ({
    getBusyCalendarTimes: jest.fn(),
    getConnectedDestinationCalendarsAndEnsureDefaultsInDb: jest.fn(),
    credentialForCalendarServiceSelect: {},
  }),
  { virtual: true }
);

import {
  APPLE_CALENDAR,
  APPLE_CALENDAR_TYPE,
  GOOGLE_CALENDAR,
  GOOGLE_CALENDAR_TYPE,
  OFFICE_365_CALENDAR,
  OFFICE_365_CALENDAR_TYPE,
} from "@calcom/platform-constants";
import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { UnifiedCalendarsFreebusyService } from "./unified-calendars-freebusy.service";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";

describe("UnifiedCalendarsFreebusyService", () => {
  let service: UnifiedCalendarsFreebusyService;
  let mockCalendarsService: { getCalendars: jest.Mock; getBusyTimes: jest.Mock };

  const userId = 42;

  beforeEach(async () => {
    mockCalendarsService = {
      getCalendars: jest.fn(),
      getBusyTimes: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedCalendarsFreebusyService,
        {
          provide: CalendarsService,
          useValue: mockCalendarsService,
        },
      ],
    }).compile();

    service = module.get<UnifiedCalendarsFreebusyService>(UnifiedCalendarsFreebusyService);
  });

  describe("getConnections", () => {
    it("should return Google Calendar connections", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 1,
            integration: { type: GOOGLE_CALENDAR_TYPE },
            primary: { externalId: "user@gmail.com" },
          },
        ],
      });

      const result = await service.getConnections(userId);

      expect(result).toEqual([{ connectionId: "1", type: GOOGLE_CALENDAR, email: "user@gmail.com" }]);
      expect(mockCalendarsService.getCalendars).toHaveBeenCalledWith(userId);
    });

    it("should return Office 365 connections", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 2,
            integration: { type: OFFICE_365_CALENDAR_TYPE },
            primary: { externalId: "user@outlook.com" },
          },
        ],
      });

      const result = await service.getConnections(userId);

      expect(result).toEqual([{ connectionId: "2", type: OFFICE_365_CALENDAR, email: "user@outlook.com" }]);
    });

    it("should return Apple Calendar connections", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 3,
            integration: { type: APPLE_CALENDAR_TYPE },
            primary: { email: "user@icloud.com" },
          },
        ],
      });

      const result = await service.getConnections(userId);

      expect(result).toEqual([{ connectionId: "3", type: APPLE_CALENDAR, email: "user@icloud.com" }]);
    });

    it("should return multiple connections from different providers", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 1,
            integration: { type: GOOGLE_CALENDAR_TYPE },
            primary: { externalId: "user@gmail.com" },
          },
          {
            credentialId: 2,
            integration: { type: OFFICE_365_CALENDAR_TYPE },
            primary: { externalId: "user@outlook.com" },
          },
          {
            credentialId: 3,
            integration: { type: APPLE_CALENDAR_TYPE },
            primary: { email: "user@icloud.com" },
          },
        ],
      });

      const result = await service.getConnections(userId);

      expect(result).toHaveLength(3);
    });

    it("should filter out unsupported calendar types", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 1,
            integration: { type: GOOGLE_CALENDAR_TYPE },
            primary: { externalId: "user@gmail.com" },
          },
          {
            credentialId: 99,
            integration: { type: "some_unsupported_calendar" },
            primary: { externalId: "user@unknown.com" },
          },
        ],
      });

      const result = await service.getConnections(userId);

      expect(result).toHaveLength(1);
      expect(result[0].connectionId).toBe("1");
    });

    it("should return empty array when no connected calendars", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [],
      });

      const result = await service.getConnections(userId);

      expect(result).toEqual([]);
    });

    it("should fall back to primary.email when externalId is missing", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 1,
            integration: { type: GOOGLE_CALENDAR_TYPE },
            primary: { email: "fallback@gmail.com" },
          },
        ],
      });

      const result = await service.getConnections(userId);

      expect(result[0].email).toBe("fallback@gmail.com");
    });

    it("should return null email when no primary info available", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 1,
            integration: { type: GOOGLE_CALENDAR_TYPE },
            primary: undefined,
          },
        ],
      });

      const result = await service.getConnections(userId);

      expect(result[0].email).toBeNull();
    });
  });

  describe("getBusyTimesForConnection", () => {
    const from = "2024-01-01T00:00:00Z";
    const to = "2024-01-31T23:59:59Z";
    const timezone = "America/New_York";

    it("should return busy times for selected calendars in a connection", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 10,
            integration: { type: GOOGLE_CALENDAR_TYPE },
            primary: { externalId: "user@gmail.com" },
            calendars: [
              { credentialId: 10, externalId: "user@gmail.com", isSelected: true },
              { credentialId: 10, externalId: "other@gmail.com", isSelected: false },
            ],
          },
        ],
      });
      const busyData = [{ start: new Date("2024-01-15T10:00:00Z"), end: new Date("2024-01-15T11:00:00Z") }];
      mockCalendarsService.getBusyTimes.mockResolvedValue(busyData);

      const result = await service.getBusyTimesForConnection(userId, 10, from, to, timezone);

      expect(result).toEqual(busyData);
      expect(mockCalendarsService.getBusyTimes).toHaveBeenCalledWith(
        [{ credentialId: 10, externalId: "user@gmail.com" }],
        userId,
        from,
        to,
        timezone
      );
    });

    it("should throw BadRequestException when connection not found", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 10,
            integration: { type: GOOGLE_CALENDAR_TYPE },
          },
        ],
      });

      await expect(service.getBusyTimesForConnection(userId, 999, from, to, timezone)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should fall back to primary calendar when no calendars are selected", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 10,
            integration: { type: GOOGLE_CALENDAR_TYPE },
            primary: { externalId: "user@gmail.com" },
            calendars: [{ credentialId: 10, externalId: "user@gmail.com", isSelected: false }],
          },
        ],
      });
      mockCalendarsService.getBusyTimes.mockResolvedValue([]);

      await service.getBusyTimesForConnection(userId, 10, from, to, timezone);

      expect(mockCalendarsService.getBusyTimes).toHaveBeenCalledWith(
        [{ credentialId: 10, externalId: "user@gmail.com" }],
        userId,
        from,
        to,
        timezone
      );
    });

    it("should return empty array when no calendars and no primary", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 10,
            integration: { type: GOOGLE_CALENDAR_TYPE },
            primary: undefined,
            calendars: [],
          },
        ],
      });

      const result = await service.getBusyTimesForConnection(userId, 10, from, to, timezone);

      expect(result).toEqual([]);
      expect(mockCalendarsService.getBusyTimes).not.toHaveBeenCalled();
    });

    it("should handle connection with no calendars array", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 10,
            integration: { type: GOOGLE_CALENDAR_TYPE },
            primary: { externalId: "user@gmail.com" },
          },
        ],
      });
      mockCalendarsService.getBusyTimes.mockResolvedValue([]);

      await service.getBusyTimesForConnection(userId, 10, from, to, timezone);

      // Should fall back to primary
      expect(mockCalendarsService.getBusyTimes).toHaveBeenCalledWith(
        [{ credentialId: 10, externalId: "user@gmail.com" }],
        userId,
        from,
        to,
        timezone
      );
    });
  });

  describe("getBusyTimesForGoogleCalendars", () => {
    const from = "2024-01-01T00:00:00Z";
    const to = "2024-01-31T23:59:59Z";
    const timezone = "UTC";

    it("should aggregate selected calendars from all Google connections", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 1,
            integration: { type: GOOGLE_CALENDAR_TYPE },
            calendars: [
              { credentialId: 1, externalId: "cal1@gmail.com", isSelected: true },
              { credentialId: 1, externalId: "cal2@gmail.com", isSelected: true },
            ],
          },
          {
            credentialId: 2,
            integration: { type: GOOGLE_CALENDAR_TYPE },
            calendars: [{ credentialId: 2, externalId: "cal3@gmail.com", isSelected: true }],
          },
        ],
      });
      const busyData = [{ start: new Date("2024-01-15T10:00:00Z"), end: new Date("2024-01-15T11:00:00Z") }];
      mockCalendarsService.getBusyTimes.mockResolvedValue(busyData);

      const result = await service.getBusyTimesForGoogleCalendars(userId, from, to, timezone);

      expect(result).toEqual(busyData);
      expect(mockCalendarsService.getBusyTimes).toHaveBeenCalledWith(
        [
          { credentialId: 1, externalId: "cal1@gmail.com" },
          { credentialId: 1, externalId: "cal2@gmail.com" },
          { credentialId: 2, externalId: "cal3@gmail.com" },
        ],
        userId,
        from,
        to,
        timezone
      );
    });

    it("should only include Google Calendar connections", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 1,
            integration: { type: GOOGLE_CALENDAR_TYPE },
            calendars: [{ credentialId: 1, externalId: "cal1@gmail.com", isSelected: true }],
          },
          {
            credentialId: 2,
            integration: { type: OFFICE_365_CALENDAR_TYPE },
            calendars: [{ credentialId: 2, externalId: "cal2@outlook.com", isSelected: true }],
          },
        ],
      });
      mockCalendarsService.getBusyTimes.mockResolvedValue([]);

      await service.getBusyTimesForGoogleCalendars(userId, from, to, timezone);

      expect(mockCalendarsService.getBusyTimes).toHaveBeenCalledWith(
        [{ credentialId: 1, externalId: "cal1@gmail.com" }],
        userId,
        from,
        to,
        timezone
      );
    });

    it("should skip unselected calendars", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 1,
            integration: { type: GOOGLE_CALENDAR_TYPE },
            calendars: [
              { credentialId: 1, externalId: "selected@gmail.com", isSelected: true },
              { credentialId: 1, externalId: "unselected@gmail.com", isSelected: false },
            ],
          },
        ],
      });
      mockCalendarsService.getBusyTimes.mockResolvedValue([]);

      await service.getBusyTimesForGoogleCalendars(userId, from, to, timezone);

      expect(mockCalendarsService.getBusyTimes).toHaveBeenCalledWith(
        [{ credentialId: 1, externalId: "selected@gmail.com" }],
        userId,
        from,
        to,
        timezone
      );
    });

    it("should return empty array when no Google calendars are selected", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 1,
            integration: { type: GOOGLE_CALENDAR_TYPE },
            calendars: [{ credentialId: 1, externalId: "cal@gmail.com", isSelected: false }],
          },
        ],
      });

      const result = await service.getBusyTimesForGoogleCalendars(userId, from, to, timezone);

      expect(result).toEqual([]);
      expect(mockCalendarsService.getBusyTimes).not.toHaveBeenCalled();
    });

    it("should return empty array when no Google connections exist", async () => {
      mockCalendarsService.getCalendars.mockResolvedValue({
        connectedCalendars: [
          {
            credentialId: 2,
            integration: { type: OFFICE_365_CALENDAR_TYPE },
            calendars: [{ credentialId: 2, externalId: "cal@outlook.com", isSelected: true }],
          },
        ],
      });

      const result = await service.getBusyTimesForGoogleCalendars(userId, from, to, timezone);

      expect(result).toEqual([]);
      expect(mockCalendarsService.getBusyTimes).not.toHaveBeenCalled();
    });
  });
});
