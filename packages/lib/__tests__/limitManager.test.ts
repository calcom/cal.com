import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";

import LimitManager from "../intervalLimits/limitManager";

describe("LimitManager", () => {
  it("should treat times within same day as already busy", () => {
    const manager = new LimitManager();

    const date1 = dayjs("2026-04-19T15:30:00Z");
    const date2 = dayjs("2026-04-19T10:00:00Z");

    manager.addBusyTime({
      start: date1,
      unit: "day",
      title: "test",
      source: "test",
    });

    const result = manager.isAlreadyBusy(date2, "day");

    expect(result).toBe(true);
  });

  it("should not mark different days as busy", () => {
    const manager = new LimitManager();

    const date1 = dayjs("2026-04-19T15:30:00Z");
    const date2 = dayjs("2026-04-20T10:00:00Z");

    manager.addBusyTime({
      start: date1,
      unit: "day",
      title: "test",
      source: "test",
    });

    const result = manager.isAlreadyBusy(date2, "day");

    expect(result).toBe(false);
  });
});