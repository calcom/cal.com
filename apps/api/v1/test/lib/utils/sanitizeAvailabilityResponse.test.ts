import { describe, expect, it } from "vitest";

import type { IOutOfOfficeData } from "@calcom/features/availability/lib/getUserAvailability";
import type { EventBusyDetails } from "@calcom/types/Calendar";

import { maskBusyTimes, maskOutOfOfficeData } from "../../../lib/utils/sanitizeAvailabilityResponse";

const createBusyTime = (overrides: Partial<EventBusyDetails> = {}): EventBusyDetails => ({
  start: new Date("2024-01-15T09:00:00Z"),
  end: new Date("2024-01-15T10:00:00Z"),
  title: "Confidential Meeting",
  source: "google-calendar",
  ...overrides,
});

const createOutOfOfficeData = (): IOutOfOfficeData => ({
  "2024-01-20": {
    fromUser: { id: 1, displayName: "John Doe" },
    toUser: { id: 2, username: "jane", displayName: "Jane Doe" },
    reason: "Vacation",
    emoji: "🏖️",
    notes: "Private notes about my vacation",
  },
  "2024-01-21": {
    fromUser: { id: 1, displayName: "John Doe" },
    toUser: null,
    reason: "Sick",
    emoji: "🤒",
    notes: null,
  },
});

describe("maskBusyTimes", () => {
  it("removes title from busy times", () => {
    const busyTimes = [createBusyTime({ title: "Secret Project Meeting" })];

    const result = maskBusyTimes(busyTimes);

    expect(result[0]).not.toHaveProperty("title");
    expect(result[0].start).toEqual(busyTimes[0].start);
    expect(result[0].end).toEqual(busyTimes[0].end);
  });

  it("preserves other fields", () => {
    const busyTimes = [createBusyTime({ source: "outlook" })];

    const result = maskBusyTimes(busyTimes);

    expect(result[0].source).toBe("outlook");
    expect(result[0].start).toEqual(busyTimes[0].start);
    expect(result[0].end).toEqual(busyTimes[0].end);
  });

  it("handles empty array", () => {
    const result = maskBusyTimes([]);

    expect(result).toEqual([]);
  });

  it("handles multiple busy times", () => {
    const busyTimes = [
      createBusyTime({ title: "Meeting 1" }),
      createBusyTime({ title: "Meeting 2" }),
      createBusyTime({ title: "Meeting 3" }),
    ];

    const result = maskBusyTimes(busyTimes);

    expect(result).toHaveLength(3);
    result.forEach((item) => {
      expect(item).not.toHaveProperty("title");
    });
  });
});

describe("maskOutOfOfficeData", () => {
  it("removes reason, emoji and notes", () => {
    const oooData = createOutOfOfficeData();

    const result = maskOutOfOfficeData(oooData);

    expect(result["2024-01-20"].reason).toBeUndefined();
    expect(result["2024-01-20"].emoji).toBeUndefined();
    expect(result["2024-01-20"].notes).toBeUndefined();
  });

  it("preserves fromUser and toUser", () => {
    const oooData = createOutOfOfficeData();

    const result = maskOutOfOfficeData(oooData);

    expect(result["2024-01-20"].fromUser).toEqual({ id: 1, displayName: "John Doe" });
    expect(result["2024-01-20"].toUser).toEqual({ id: 2, username: "jane", displayName: "Jane Doe" });
  });

  it("handles null toUser", () => {
    const oooData = createOutOfOfficeData();

    const result = maskOutOfOfficeData(oooData);

    expect(result["2024-01-21"].toUser).toBeNull();
  });

  it("handles empty object", () => {
    const result = maskOutOfOfficeData({});

    expect(result).toEqual({});
  });

  it("preserves all date keys", () => {
    const oooData = createOutOfOfficeData();

    const result = maskOutOfOfficeData(oooData);

    expect(Object.keys(result)).toEqual(["2024-01-20", "2024-01-21"]);
  });
});
