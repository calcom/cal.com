import { expect, it, describe, vi, afterEach } from "vitest";

import { getTimesForSchedule } from "./getTimesForSchedule";

function toLocalIsoWithOffset(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const offset = -date.getTimezoneOffset(); // in minutes
  const sign = offset >= 0 ? "+" : "-";
  const offsetHours = pad(Math.floor(Math.abs(offset) / 60));
  const offsetMinutes = pad(Math.abs(offset) % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMinutes}`;
}

describe("getTimesForSchedule", () => {
  afterEach(() => {
    // Reset the mocked time after each test
    vi.useRealTimers();
  });

  it("starts at the current month", () => {
    vi.setSystemTime(new Date("2025-08-23T00:00:00Z"));
    {
      const [startTime, endTime] = getTimesForSchedule({});
      expect(toLocalIsoWithOffset(new Date(startTime)).startsWith("2025-08-01T00:00:00")).toBe(true);
      expect(toLocalIsoWithOffset(new Date(endTime)).startsWith("2025-09-01T00:00:00")).toBe(true);
    }
  });

  it("can select a full (next) month", () => {
    {
      const [startTime, endTime] = getTimesForSchedule({
        month: "2025-10",
      });
      expect(toLocalIsoWithOffset(new Date(startTime)).startsWith("2025-10-01T00:00:00")).toBe(true);
      expect(toLocalIsoWithOffset(new Date(endTime)).startsWith("2025-11-01T00:00:00")).toBe(true);
    }
  });

  it("can select multiple months", () => {
    {
      const [startTime, endTime] = getTimesForSchedule({
        month: "2025-10",
        monthCount: 2,
      });
      expect(toLocalIsoWithOffset(new Date(startTime)).startsWith("2025-10-01T00:00:00")).toBe(true);
      expect(toLocalIsoWithOffset(new Date(endTime)).startsWith("2025-12-01T00:00:00")).toBe(true);
    }
  });

  it("can select the next 7 days", () => {
    vi.setSystemTime(new Date("2025-08-23T01:00:00+01:00"));
    {
      const [startTime, endTime] = getTimesForSchedule({
        selectedDate: new Date().toISOString(),
        dayCount: 7,
      });
      expect(startTime).toBe("2025-08-23T00:00:00.000Z");
      expect(endTime).toBe("2025-08-30T00:00:00.000Z");
    }
    vi.setSystemTime(new Date("2025-08-01T00:00:00Z"));
    console.log(new Date().toISOString());
    {
      const [startTime, endTime] = getTimesForSchedule({
        selectedDate: new Date().toISOString(),
        dayCount: 7,
      });
      expect(startTime).toBe("2025-08-01T00:00:00.000Z");
      expect(endTime).toBe("2025-08-08T00:00:00.000Z");
    }
    vi.setSystemTime(new Date("2025-08-23T13:00:00+01:00"));
    {
      const [startTime, endTime] = getTimesForSchedule({
        selectedDate: new Date().toISOString(),
        dayCount: 7,
      });
      expect(startTime).toBe("2025-08-23T12:00:00.000Z");
      expect(endTime).toBe("2025-08-30T12:00:00.000Z");
    }
  });

  it("can select the next 7 days from now", () => {
    vi.setSystemTime(new Date("2025-08-23T01:00:00+01:00"));
    {
      const [startTime, endTime] = getTimesForSchedule({
        dayCount: 7,
      });
      expect(startTime).toBe("2025-08-22T23:00:00.000Z");
      expect(endTime).toBe("2025-08-29T23:00:00.000Z");
    }
  });

  it("can select the first 7 days of a month", () => {
    vi.setSystemTime(new Date("2025-08-23T01:00:00+01:00"));
    {
      const [startTime, endTime] = getTimesForSchedule({
        month: "2025-10",
        dayCount: 7,
      });
      expect(toLocalIsoWithOffset(new Date(startTime)).startsWith("2025-10-01T00:00:00")).toBe(true);
      expect(toLocalIsoWithOffset(new Date(endTime)).startsWith("2025-10-08T00:00:00")).toBe(true);
    }
  });
});
