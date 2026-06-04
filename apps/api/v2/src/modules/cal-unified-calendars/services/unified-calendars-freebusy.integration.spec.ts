/**
 * Integration-style tests that use the real @calcom/platform-libraries package (no virtual mock).
 * We import the real ConnectedDestinationCalendars type so that if the package or type shape changes,
 * this file will still compile and tests validate our service against the subset of fields we use.
 * CalendarsService is still mocked so we don't require DB/Redis. Mock data uses a minimal shape
 * (cast to the real type) that matches what UnifiedCalendarsFreebusyService actually reads.
 */

import {
  GOOGLE_CALENDAR_TYPE,
} from "@calcom/platform-constants";
import type { ConnectedDestinationCalendars } from "@calcom/platform-libraries";
import { Test, TestingModule } from "@nestjs/testing";
import { UnifiedCalendarsFreebusyService } from "./unified-calendars-freebusy.service";
import { CalendarsService } from "@/platform/calendars/services/calendars.service";

describe("UnifiedCalendarsFreebusyService (integration with real platform-libraries types)", () => {
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
        { provide: CalendarsService, useValue: mockCalendarsService },
      ],
    }).compile();

    service = module.get<UnifiedCalendarsFreebusyService>(UnifiedCalendarsFreebusyService);
  });

  it("getBusyTimesForConnection works with real-shaped calendar list and delegates to getBusyTimes", async () => {
    const mockConnectionData = {
      connectedCalendars: [
        {
          credentialId: 100,
          integration: { type: GOOGLE_CALENDAR_TYPE },
          primary: { externalId: "user@gmail.com" },
          calendars: [
            { credentialId: 100, externalId: "cal1@group.calendar.google.com", isSelected: true },
            { credentialId: 100, externalId: "cal2@group.calendar.google.com", isSelected: false },
          ],
        },
      ],
      destinationCalendar: null,
    } as unknown as ConnectedDestinationCalendars;
    mockCalendarsService.getCalendarsForConnection.mockResolvedValue(mockConnectionData);
    mockCalendarsService.getBusyTimes.mockResolvedValue([
      { start: "2025-03-10T09:00:00Z", end: "2025-03-10T10:00:00Z" },
    ]);

    const result = await service.getBusyTimesForConnection(
      userId,
      100,
      "2025-03-10T00:00:00Z",
      "2025-03-11T00:00:00Z",
      "UTC"
    );

    expect(result).toEqual([{ start: "2025-03-10T09:00:00Z", end: "2025-03-10T10:00:00Z" }]);
    expect(mockCalendarsService.getCalendarsForConnection).toHaveBeenCalledWith(userId, 100);
    expect(mockCalendarsService.getBusyTimes).toHaveBeenCalledWith(
      [{ credentialId: 100, externalId: "cal1@group.calendar.google.com" }],
      userId,
      "2025-03-10T00:00:00Z",
      "2025-03-11T00:00:00Z",
      "UTC"
    );
  });
});
