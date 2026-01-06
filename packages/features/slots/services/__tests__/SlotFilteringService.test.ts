import { describe, expect, it } from "vitest";

import { SlotFilteringService } from "../SlotFilteringService";

describe("SlotFilteringService", () => {
  const service = new SlotFilteringService();

  describe("filterSlotsByRequestedDateRange", () => {
    it("should return slots unchanged when timeZone is undefined", () => {
      const slotsMappedToDate = {
        "2024-01-15": [{ time: "2024-01-15T10:00:00Z" }],
        "2024-01-16": [{ time: "2024-01-16T10:00:00Z" }],
      };

      const result = service.filterSlotsByRequestedDateRange({
        slotsMappedToDate,
        startTime: "2024-01-15T00:00:00Z",
        endTime: "2024-01-16T23:59:59Z",
        timeZone: undefined,
      });

      expect(result).toEqual(slotsMappedToDate);
    });

    it("should filter out dates outside the requested range", () => {
      const slotsMappedToDate = {
        "2024-01-14": [{ time: "2024-01-14T10:00:00Z" }],
        "2024-01-15": [{ time: "2024-01-15T10:00:00Z" }],
        "2024-01-16": [{ time: "2024-01-16T10:00:00Z" }],
        "2024-01-17": [{ time: "2024-01-17T10:00:00Z" }],
      };

      const result = service.filterSlotsByRequestedDateRange({
        slotsMappedToDate,
        startTime: "2024-01-15T00:00:00Z",
        endTime: "2024-01-16T23:59:59Z",
        timeZone: "UTC",
      });

      expect(result).toEqual({
        "2024-01-15": [{ time: "2024-01-15T10:00:00Z" }],
        "2024-01-16": [{ time: "2024-01-16T10:00:00Z" }],
      });
    });

    it("should handle single day range", () => {
      const slotsMappedToDate = {
        "2024-01-14": [{ time: "2024-01-14T10:00:00Z" }],
        "2024-01-15": [{ time: "2024-01-15T10:00:00Z" }],
        "2024-01-16": [{ time: "2024-01-16T10:00:00Z" }],
      };

      const result = service.filterSlotsByRequestedDateRange({
        slotsMappedToDate,
        startTime: "2024-01-15T00:00:00Z",
        endTime: "2024-01-15T23:59:59Z",
        timeZone: "UTC",
      });

      expect(result).toEqual({
        "2024-01-15": [{ time: "2024-01-15T10:00:00Z" }],
      });
    });

    it("should handle timezone conversion correctly", () => {
      const slotsMappedToDate = {
        "2024-01-14": [{ time: "2024-01-14T10:00:00Z" }],
        "2024-01-15": [{ time: "2024-01-15T10:00:00Z" }],
        "2024-01-16": [{ time: "2024-01-16T10:00:00Z" }],
      };

      const result = service.filterSlotsByRequestedDateRange({
        slotsMappedToDate,
        startTime: "2024-01-15T00:00:00-05:00",
        endTime: "2024-01-16T23:59:59-05:00",
        timeZone: "America/New_York",
      });

      expect(Object.keys(result)).toContain("2024-01-15");
      expect(Object.keys(result)).toContain("2024-01-16");
    });

    it("should preserve slot data including attendees and bookingUid", () => {
      const slotsMappedToDate = {
        "2024-01-15": [
          { time: "2024-01-15T10:00:00Z", attendees: 5, bookingUid: "abc123" },
          { time: "2024-01-15T11:00:00Z", attendees: 3 },
        ],
      };

      const result = service.filterSlotsByRequestedDateRange({
        slotsMappedToDate,
        startTime: "2024-01-15T00:00:00Z",
        endTime: "2024-01-15T23:59:59Z",
        timeZone: "UTC",
      });

      expect(result["2024-01-15"]).toEqual([
        { time: "2024-01-15T10:00:00Z", attendees: 5, bookingUid: "abc123" },
        { time: "2024-01-15T11:00:00Z", attendees: 3 },
      ]);
    });

    it("should return empty object when no dates match", () => {
      const slotsMappedToDate = {
        "2024-01-10": [{ time: "2024-01-10T10:00:00Z" }],
        "2024-01-11": [{ time: "2024-01-11T10:00:00Z" }],
      };

      const result = service.filterSlotsByRequestedDateRange({
        slotsMappedToDate,
        startTime: "2024-01-15T00:00:00Z",
        endTime: "2024-01-16T23:59:59Z",
        timeZone: "UTC",
      });

      expect(result).toEqual({});
    });
  });

  describe("getAllDatesWithBookabilityStatus", () => {
    it("should mark available dates as bookable", () => {
      const availableDates = ["2024-01-15", "2024-01-16", "2024-01-17"];

      const result = service.getAllDatesWithBookabilityStatus(availableDates);

      expect(result["2024-01-15"]).toEqual({ isBookable: true });
      expect(result["2024-01-16"]).toEqual({ isBookable: true });
      expect(result["2024-01-17"]).toEqual({ isBookable: true });
    });

    it("should fill in intermediate dates as not bookable", () => {
      const availableDates = ["2024-01-15", "2024-01-18"];

      const result = service.getAllDatesWithBookabilityStatus(availableDates);

      expect(result["2024-01-15"]).toEqual({ isBookable: true });
      expect(result["2024-01-16"]).toEqual({ isBookable: false });
      expect(result["2024-01-17"]).toEqual({ isBookable: false });
      expect(result["2024-01-18"]).toEqual({ isBookable: true });
    });

    it("should handle single date", () => {
      const availableDates = ["2024-01-15"];

      const result = service.getAllDatesWithBookabilityStatus(availableDates);

      expect(result).toEqual({
        "2024-01-15": { isBookable: true },
      });
    });

    it("should handle consecutive dates correctly", () => {
      const availableDates = ["2024-01-15", "2024-01-16"];

      const result = service.getAllDatesWithBookabilityStatus(availableDates);

      expect(Object.keys(result).length).toBe(2);
      expect(result["2024-01-15"]).toEqual({ isBookable: true });
      expect(result["2024-01-16"]).toEqual({ isBookable: true });
    });

    it("should handle sparse availability with multiple gaps", () => {
      const availableDates = ["2024-01-15", "2024-01-17", "2024-01-20"];

      const result = service.getAllDatesWithBookabilityStatus(availableDates);

      expect(result["2024-01-15"]).toEqual({ isBookable: true });
      expect(result["2024-01-16"]).toEqual({ isBookable: false });
      expect(result["2024-01-17"]).toEqual({ isBookable: true });
      expect(result["2024-01-18"]).toEqual({ isBookable: false });
      expect(result["2024-01-19"]).toEqual({ isBookable: false });
      expect(result["2024-01-20"]).toEqual({ isBookable: true });
    });
  });
});
