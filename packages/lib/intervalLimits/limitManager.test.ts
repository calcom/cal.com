import dayjs from "@calcom/dayjs";
import { describe, expect, it } from "vitest";
import LimitManager from "./limitManager";

describe("LimitManager", () => {
  describe("addBusyTime and getBusyTimes", () => {
    it("starts with empty busy times", () => {
      const manager = new LimitManager();
      expect(manager.getBusyTimes()).toEqual([]);
    });

    it("adds a busy time and retrieves it", () => {
      const manager = new LimitManager();
      const start = dayjs("2024-06-15T10:00:00Z").utc();

      manager.addBusyTime(start, "day");

      const busyTimes = manager.getBusyTimes();
      expect(busyTimes).toHaveLength(1);
      expect(busyTimes[0].start).toBeDefined();
      expect(busyTimes[0].end).toBeDefined();
    });

    it("adds multiple busy times for different units", () => {
      const manager = new LimitManager();
      const start = dayjs("2024-06-15T10:00:00Z").utc();

      manager.addBusyTime(start, "day");
      manager.addBusyTime(start, "week");

      expect(manager.getBusyTimes()).toHaveLength(2);
    });
  });

  describe("isAlreadyBusy", () => {
    it("returns false when no busy times exist", () => {
      const manager = new LimitManager();
      const start = dayjs("2024-06-15T10:00:00Z").utc();

      expect(manager.isAlreadyBusy(start, "day")).toBe(false);
    });

    it("returns true when the year is already busy (ancestor check)", () => {
      const manager = new LimitManager();
      const start = dayjs("2024-06-15T10:00:00Z").utc();

      // Use startOf("year") so addBusyTime's key matches createKey's lookup
      manager.addBusyTime(start.startOf("year"), "year");

      // Any unit should return true if the year is busy
      expect(manager.isAlreadyBusy(start, "day")).toBe(true);
      expect(manager.isAlreadyBusy(start, "week")).toBe(true);
      expect(manager.isAlreadyBusy(start, "month")).toBe(true);
    });

    it("returns true for day when month is already busy", () => {
      const manager = new LimitManager();
      const start = dayjs("2024-06-15T10:00:00Z").utc();

      manager.addBusyTime(start.startOf("month"), "month");

      expect(manager.isAlreadyBusy(start, "day")).toBe(true);
    });

    it("returns true for day when week is already busy", () => {
      const manager = new LimitManager();
      const start = dayjs("2024-06-15T10:00:00Z").utc();

      manager.addBusyTime(start.startOf("week"), "week");

      expect(manager.isAlreadyBusy(start, "day")).toBe(true);
    });

    it("returns true for day when same day is already busy", () => {
      const manager = new LimitManager();
      const start = dayjs("2024-06-15T10:00:00Z").utc();

      manager.addBusyTime(start.startOf("day"), "day");

      expect(manager.isAlreadyBusy(start, "day")).toBe(true);
    });

    it("returns true for month when same month is already busy", () => {
      const manager = new LimitManager();
      const start = dayjs("2024-06-15T10:00:00Z").utc();

      manager.addBusyTime(start.startOf("month"), "month");

      expect(manager.isAlreadyBusy(start, "month")).toBe(true);
    });

    it("returns false for month when only a day is busy", () => {
      const manager = new LimitManager();
      const start = dayjs("2024-06-15T10:00:00Z").utc();

      manager.addBusyTime(start.startOf("day"), "day");

      expect(manager.isAlreadyBusy(start, "month")).toBe(false);
    });
  });

  describe("mergeBusyTimes", () => {
    it("merges busy times from another manager", () => {
      const manager1 = new LimitManager();
      const manager2 = new LimitManager();
      const start1 = dayjs("2024-06-15T10:00:00Z").utc();
      const start2 = dayjs("2024-07-15T10:00:00Z").utc();

      manager1.addBusyTime(start1, "day");
      manager2.addBusyTime(start2, "day");

      manager1.mergeBusyTimes(manager2);

      expect(manager1.getBusyTimes()).toHaveLength(2);
    });

    it("does not duplicate existing busy times", () => {
      const manager1 = new LimitManager();
      const manager2 = new LimitManager();
      const start = dayjs("2024-06-15T10:00:00Z").utc();

      manager1.addBusyTime(start, "day");
      manager2.addBusyTime(start, "day");

      manager1.mergeBusyTimes(manager2);

      expect(manager1.getBusyTimes()).toHaveLength(1);
    });
  });
});
