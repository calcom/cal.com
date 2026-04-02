/**
 * Virtual mock is required because CalendarsService (imported for the DI token) has
 * runtime imports from @calcom/platform-libraries whose transitive dependencies
 * (prisma, DB) cannot be resolved in the Jest unit-test environment.
 * The integration spec (unified-calendars-freebusy.integration.spec.ts) imports the
 * real ConnectedDestinationCalendars type to catch type-shape changes at compile time.
 */
jest.mock(
  "@calcom/platform-libraries",
  () => ({
    getBusyCalendarTimes: jest.fn(),
    getConnectedDestinationCalendarsAndEnsureDefaultsInDb: jest.fn(),
    credentialForCalendarServiceSelect: {},
  }),
  { virtual: true }
);

import { GOOGLE_CALENDAR_TYPE, OFFICE_365_CALENDAR_TYPE } from "@calcom/platform-constants";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { UnifiedCalendarsFreebusyService } from "./unified-calendars-freebusy.service";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";

describe("UnifiedCalendarsFreebusyService", () => {
  let service: UnifiedCalendarsFreebusyService;
  let mockCalendarsService: {
    getCalendars: jest.Mock;
    getCalendarsForConnection: jest.Mock;
    getBusyTimes: jest.Mock;
  };

  const userId = 42;

  beforeEach(async () => {
    mockCalendarsService = {
      getCalendars: jest.fn(),
      getCalendarsForConnection: jest.fn(),
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

  describe("getBusyTimesForConnection", () => {
    const from = "2024-01-01T00:00:00Z";
    const to = "2024-01-31T23:59:59Z";
    const timezone = "America/New_York";

    it("should return busy times for selected calendars in a connection", async () => {
      mockCalendarsService.getCalendarsForConnection.mockResolvedValue({
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
      expect(mockCalendarsService.getCalendarsForConnection).toHaveBeenCalledWith(userId, 10);
      expect(mockCalendarsService.getBusyTimes).toHaveBeenCalledWith(
        [{ credentialId: 10, externalId: "user@gmail.com" }],
        userId,
        from,
        to,
        timezone
      );
    });

    it("should throw when connection not found", async () => {
      mockCalendarsService.getCalendarsForConnection.mockRejectedValue(
        new NotFoundException("Calendar connection not found")
      );

      await expect(service.getBusyTimesForConnection(userId, 999, from, to, timezone)).rejects.toThrow(
        NotFoundException
      );
    });

    it("should fall back to primary calendar when no calendars are selected", async () => {
      mockCalendarsService.getCalendarsForConnection.mockResolvedValue({
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
      mockCalendarsService.getCalendarsForConnection.mockResolvedValue({
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
      mockCalendarsService.getCalendarsForConnection.mockResolvedValue({
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
