import dayjs from "@calcom/dayjs";
import { BookerLayouts } from "@calcom/prisma/zod-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isPrefetchNextMonthEnabled } from "./isPrefetchNextMonthEnabled";

describe("isPrefetchNextMonthEnabled", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("WEEK_VIEW layout", () => {
    it("should return true when extraDays is provided and months change", () => {
      const date = "2024-01-28";
      const dateMonth = dayjs(date).month();
      const extraDays = 7;
      const monthAfterAddingExtraDays = dayjs(date).add(extraDays, "day").month();
      const monthAfterAddingExtraDaysColumnView = dayjs(date).add(5, "day").month();

      const result = isPrefetchNextMonthEnabled(
        BookerLayouts.WEEK_VIEW,
        date,
        dateMonth,
        monthAfterAddingExtraDays,
        monthAfterAddingExtraDaysColumnView,
        "2024-01-01",
        extraDays
      );
      expect(result).toBe(true);
    });

    it("should return false when extraDays is provided but months don't change", () => {
      const date = "2024-01-15";
      const dateMonth = dayjs(date).month();
      const extraDays = 7;
      const monthAfterAddingExtraDays = dayjs(date).add(extraDays, "day").month();
      const monthAfterAddingExtraDaysColumnView = dayjs(date).add(5, "day").month();

      const result = isPrefetchNextMonthEnabled(
        BookerLayouts.WEEK_VIEW,
        date,
        dateMonth,
        monthAfterAddingExtraDays,
        monthAfterAddingExtraDaysColumnView,
        "2024-01-01",
        extraDays
      );
      expect(result).toBe(false);
    });

    it("should return false when extraDays is not provided", () => {
      const date = "2024-01-28";
      const dateMonth = dayjs(date).month();
      const monthAfterAddingExtraDays = dayjs(date).add(7, "day").month();
      const monthAfterAddingExtraDaysColumnView = dayjs(date).add(5, "day").month();

      const result = isPrefetchNextMonthEnabled(
        BookerLayouts.WEEK_VIEW,
        date,
        dateMonth,
        monthAfterAddingExtraDays,
        monthAfterAddingExtraDaysColumnView,
        "2024-01-01",
        undefined
      );
      expect(result).toBe(false);
    });

    it("should return false when extraDays is 0", () => {
      const date = "2024-01-28";
      const dateMonth = dayjs(date).month();
      const monthAfterAddingExtraDays = dayjs(date).month();
      const monthAfterAddingExtraDaysColumnView = dayjs(date).add(5, "day").month();

      const result = isPrefetchNextMonthEnabled(
        BookerLayouts.WEEK_VIEW,
        date,
        dateMonth,
        monthAfterAddingExtraDays,
        monthAfterAddingExtraDaysColumnView,
        "2024-01-01",
        0
      );
      expect(result).toBe(false);
    });
  });

  describe("COLUMN_VIEW layout", () => {
    it("should return true when months change after adding columnView extra days", () => {
      const date = "2024-01-30";
      const dateMonth = dayjs(date).month();
      const monthAfterAddingExtraDays = dayjs(date).add(7, "day").month();
      const monthAfterAddingExtraDaysColumnView = dayjs(date).add(5, "day").month();

      const result = isPrefetchNextMonthEnabled(
        BookerLayouts.COLUMN_VIEW,
        date,
        dateMonth,
        monthAfterAddingExtraDays,
        monthAfterAddingExtraDaysColumnView,
        "2024-01-01"
      );
      expect(result).toBe(true);
    });

    it("should return false when months don't change after adding columnView extra days", () => {
      const date = "2024-01-10";
      const dateMonth = dayjs(date).month();
      const monthAfterAddingExtraDays = dayjs(date).add(7, "day").month();
      const monthAfterAddingExtraDaysColumnView = dayjs(date).add(5, "day").month();

      const result = isPrefetchNextMonthEnabled(
        BookerLayouts.COLUMN_VIEW,
        date,
        dateMonth,
        monthAfterAddingExtraDays,
        monthAfterAddingExtraDaysColumnView,
        "2024-01-01"
      );
      expect(result).toBe(false);
    });
  });

  describe("MONTH_VIEW layout", () => {
    it("should return true when conditions for month view prefetch are met", () => {
      vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));

      const date = "invalid-date";
      const dateMonth = dayjs(date).month();
      const monthAfterAddingExtraDays = dayjs(date).add(7, "day").month();
      const monthAfterAddingExtraDaysColumnView = dayjs(date).add(5, "day").month();

      const result = isPrefetchNextMonthEnabled(
        BookerLayouts.MONTH_VIEW,
        date,
        dateMonth,
        monthAfterAddingExtraDays,
        monthAfterAddingExtraDaysColumnView,
        "2024-01-01"
      );
      expect(result).toBe(true);
    });

    it("should return false when current time is before 2 weeks threshold", () => {
      vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));

      const date = "invalid-date";
      const dateMonth = dayjs(date).month();
      const monthAfterAddingExtraDays = dayjs(date).add(7, "day").month();
      const monthAfterAddingExtraDaysColumnView = dayjs(date).add(5, "day").month();

      const result = isPrefetchNextMonthEnabled(
        BookerLayouts.MONTH_VIEW,
        date,
        dateMonth,
        monthAfterAddingExtraDays,
        monthAfterAddingExtraDaysColumnView,
        "2024-01-01"
      );
      expect(result).toBe(false);
    });
  });

  describe("mobile layout", () => {
    it("should return true when conditions for month view prefetch are met", () => {
      vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));

      const date = "invalid-date";
      const dateMonth = dayjs(date).month();
      const monthAfterAddingExtraDays = dayjs(date).add(7, "day").month();
      const monthAfterAddingExtraDaysColumnView = dayjs(date).add(5, "day").month();

      const result = isPrefetchNextMonthEnabled(
        "mobile",
        date,
        dateMonth,
        monthAfterAddingExtraDays,
        monthAfterAddingExtraDaysColumnView,
        "2024-01-01"
      );
      expect(result).toBe(true);
    });
  });

  describe("unknown layout", () => {
    it("should return false for unrecognized layout", () => {
      const date = "2024-01-15";
      const dateMonth = dayjs(date).month();
      const monthAfterAddingExtraDays = dayjs(date).add(7, "day").month();
      const monthAfterAddingExtraDaysColumnView = dayjs(date).add(5, "day").month();

      const result = isPrefetchNextMonthEnabled(
        "unknown-layout",
        date,
        dateMonth,
        monthAfterAddingExtraDays,
        monthAfterAddingExtraDaysColumnView,
        "2024-01-01"
      );
      expect(result).toBe(false);
    });
  });
});
