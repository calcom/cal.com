import { expect, test, beforeEach, vi, describe } from "vitest";
import "vitest-fetch-mock";

import CalendarService from "../CalendarService";

describe("GoogleCalendarService.getFreeBusyResult - shouldServeCache logic", () => {
  let calendarService: CalendarService;
  let fetchAvailabilitySpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    calendarService = {} as CalendarService;

    const mockFetchAvailability = vi.fn().mockResolvedValue({
      calendars: {
        "test@example.com": {
          busy: [
            {
              start: "2023-12-01T20:00:00Z",
              end: "2023-12-01T21:00:00Z",
            },
          ],
        },
      },
    });

    calendarService.fetchAvailability = mockFetchAvailability;
    fetchAvailabilitySpy = mockFetchAvailability;

    calendarService.getFreeBusyResult = CalendarService.prototype.getFreeBusyResult.bind(calendarService);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (calendarService as any).credential = { id: 1, userId: 1 };
  });

  describe("shouldServeCache parameter handling", () => {
    test("should call fetchAvailability immediately when shouldServeCache is explicitly false", async () => {
      const args = {
        timeMin: new Date().toISOString(),
        timeMax: new Date().toISOString(),
        items: [{ id: "test@example.com" }],
      };

      const result = await calendarService.getFreeBusyResult(args, false);

      expect(fetchAvailabilitySpy).toHaveBeenCalledWith(args);
      expect(fetchAvailabilitySpy).toHaveBeenCalledTimes(1);
      expect(result.calendars?.["test@example.com"]?.busy).toEqual([
        {
          start: "2023-12-01T20:00:00Z",
          end: "2023-12-01T21:00:00Z",
        },
      ]);
    });

    test("should call fetchAvailability immediately when shouldServeCache is undefined (falsey)", async () => {
      const args = {
        timeMin: new Date().toISOString(),
        timeMax: new Date().toISOString(),
        items: [{ id: "test@example.com" }],
      };

      const result = await calendarService.getFreeBusyResult(args, undefined);

      expect(fetchAvailabilitySpy).toHaveBeenCalledWith(args);
      expect(fetchAvailabilitySpy).toHaveBeenCalledTimes(1);
      expect(result.calendars?.["test@example.com"]?.busy).toEqual([
        {
          start: "2023-12-01T20:00:00Z",
          end: "2023-12-01T21:00:00Z",
        },
      ]);
    });

    test("should call fetchAvailability immediately when shouldServeCache is null (falsey)", async () => {
      const args = {
        timeMin: new Date().toISOString(),
        timeMax: new Date().toISOString(),
        items: [{ id: "test@example.com" }],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await calendarService.getFreeBusyResult(args, null as any);

      expect(fetchAvailabilitySpy).toHaveBeenCalledWith(args);
      expect(fetchAvailabilitySpy).toHaveBeenCalledTimes(1);
      expect(result.calendars?.["test@example.com"]?.busy).toEqual([
        {
          start: "2023-12-01T20:00:00Z",
          end: "2023-12-01T21:00:00Z",
        },
      ]);
    });

    test("should call fetchAvailability immediately when shouldServeCache is 0 (falsey)", async () => {
      const args = {
        timeMin: new Date().toISOString(),
        timeMax: new Date().toISOString(),
        items: [{ id: "test@example.com" }],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await calendarService.getFreeBusyResult(args, 0 as any);

      expect(fetchAvailabilitySpy).toHaveBeenCalledWith(args);
      expect(fetchAvailabilitySpy).toHaveBeenCalledTimes(1);
      expect(result.calendars?.["test@example.com"]?.busy).toEqual([
        {
          start: "2023-12-01T20:00:00Z",
          end: "2023-12-01T21:00:00Z",
        },
      ]);
    });

    test("should call fetchAvailability immediately when shouldServeCache is empty string (falsey)", async () => {
      const args = {
        timeMin: new Date().toISOString(),
        timeMax: new Date().toISOString(),
        items: [{ id: "test@example.com" }],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await calendarService.getFreeBusyResult(args, "" as any);

      expect(fetchAvailabilitySpy).toHaveBeenCalledWith(args);
      expect(fetchAvailabilitySpy).toHaveBeenCalledTimes(1);
      expect(result.calendars?.["test@example.com"]?.busy).toEqual([
        {
          start: "2023-12-01T20:00:00Z",
          end: "2023-12-01T21:00:00Z",
        },
      ]);
    });
  });
});
