import { describe, expect, test, vi } from "vitest";

import type { CalendarEvent } from "@calcom/types/Calendar";

import GoogleCalendarService from "./CalendarService";

describe("GoogleCalendarService.deleteEvent", () => {
  const uid = "test-event-id";
  const event = { title: "Test Event" } as CalendarEvent;

  function makeServiceWithError(error: unknown) {
    const calendar = {
      events: {
        delete: vi.fn().mockRejectedValue(error),
      },
    };

    const service = {
      authedCalendar: vi.fn().mockResolvedValue(calendar),
      log: { error: vi.fn() },
    } as unknown as GoogleCalendarService;

    return { service, calendar };
  }

  test("does not throw when Google error has status=404 (no code)", async () => {
    const error = Object.assign(new Error("Not found"), { status: 404 });

    const { service } = makeServiceWithError(error);

    await expect(
      GoogleCalendarService.prototype.deleteEvent.call(service, uid, event, "primary")
    ).resolves.toBeUndefined();
  });

  test("does not throw when Google error has status=410 (no code)", async () => {
    const error = Object.assign(new Error("Gone"), { status: 410 });

    const { service } = makeServiceWithError(error);

    await expect(
      GoogleCalendarService.prototype.deleteEvent.call(service, uid, event, "primary")
    ).resolves.toBeUndefined();
  });

  test("does not throw when Google error has response.status=404", async () => {
    const error = Object.assign(new Error("Not found"), { response: { status: 404 } });

    const { service } = makeServiceWithError(error);

    await expect(
      GoogleCalendarService.prototype.deleteEvent.call(service, uid, event, "primary")
    ).resolves.toBeUndefined();
  });

  test("throws when Google error has non-404/410 status", async () => {
    const error = Object.assign(new Error("Server error"), { status: 500 });

    const { service } = makeServiceWithError(error);

    await expect(
      GoogleCalendarService.prototype.deleteEvent.call(service, uid, event, "primary")
    ).rejects.toBe(error);
  });

  test("does not throw when Google error has code=404 (original behavior)", async () => {
    const error = Object.assign(new Error("Not found"), { code: 404 });

    const { service } = makeServiceWithError(error);

    await expect(
      GoogleCalendarService.prototype.deleteEvent.call(service, uid, event, "primary")
    ).resolves.toBeUndefined();
  });
});
