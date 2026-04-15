import { describe, it, expect } from "vitest";

import { Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";

import { mapHostCreateData, mapHostUpdateData } from "./hostDataMapping";

describe("update.handler", () => {
  describe("bookingFields null to Prisma.DbNull transformation", () => {
    function transformBookingFields(
      bookingFields: null | undefined | Prisma.InputJsonValue
    ): typeof Prisma.DbNull | Prisma.InputJsonValue | undefined {
      return bookingFields === null ? Prisma.DbNull : (bookingFields as Prisma.InputJsonValue | undefined);
    }

    it("should convert null to Prisma.DbNull", () => {
      const result = transformBookingFields(null);
      expect(result).toBe(Prisma.DbNull);
    });

    it("should pass through undefined as-is", () => {
      const result = transformBookingFields(undefined);
      expect(result).toBeUndefined();
    });

    it("should pass through an array of booking fields as-is", () => {
      const bookingFieldsArray = [
        {
          name: "email",
          type: "email",
          label: "Email",
          required: true,
          hidden: false,
        },
        {
          name: "name",
          type: "name",
          label: "Name",
          required: true,
          hidden: false,
        },
      ];

      const result = transformBookingFields(bookingFieldsArray);
      expect(result).toEqual(bookingFieldsArray);
    });

    it("should pass through an empty array as-is", () => {
      const result = transformBookingFields([]);
      expect(result).toEqual([]);
    });

    it("should distinguish between null and empty array", () => {
      const nullResult = transformBookingFields(null);
      const emptyArrayResult = transformBookingFields([]);

      expect(nullResult).toBe(Prisma.DbNull);
      expect(emptyArrayResult).toEqual([]);
      expect(nullResult).not.toEqual(emptyArrayResult);
    });
  });

  describe("host override persistence mapping", () => {
    it("maps host overrides to create payload and defaults scheduleId to null", () => {
      const created = mapHostCreateData({
        schedulingType: SchedulingType.ROUND_ROBIN,
        host: {
          userId: 101,
          isFixed: false,
          priority: 3,
          weight: 90,
          groupId: "group-a",
          overrideMinimumBookingNotice: 60,
          overrideBeforeEventBuffer: 10,
          overrideAfterEventBuffer: 20,
          overrideSlotInterval: 15,
          overrideBookingLimits: { day: 2 },
          overrideDurationLimits: { day: 90 },
          overridePeriodType: "ROLLING",
          overridePeriodStartDate: new Date("2026-04-10T00:00:00.000Z"),
          overridePeriodEndDate: new Date("2026-05-10T00:00:00.000Z"),
          overridePeriodDays: 30,
          overridePeriodCountCalendarDays: true,
        },
      });

      expect(created).toMatchObject({
        userId: 101,
        isFixed: false,
        scheduleId: null,
        overrideMinimumBookingNotice: 60,
        overrideBeforeEventBuffer: 10,
        overrideAfterEventBuffer: 20,
        overrideSlotInterval: 15,
        overrideBookingLimits: { day: 2 },
        overrideDurationLimits: { day: 90 },
        overridePeriodType: "ROLLING",
        overridePeriodDays: 30,
        overridePeriodCountCalendarDays: true,
      });
    });

    it("maps host overrides to update payload and preserves undefined scheduleId", () => {
      const updated = mapHostUpdateData({
        schedulingType: SchedulingType.ROUND_ROBIN,
        host: {
          userId: 202,
          isFixed: false,
          priority: 2,
          weight: 100,
          groupId: null,
          scheduleId: undefined,
          overrideMinimumBookingNotice: null,
          overrideBeforeEventBuffer: null,
          overrideAfterEventBuffer: null,
          overrideSlotInterval: null,
          overrideBookingLimits: null,
          overrideDurationLimits: null,
          overridePeriodType: null,
          overridePeriodStartDate: null,
          overridePeriodEndDate: null,
          overridePeriodDays: null,
          overridePeriodCountCalendarDays: null,
        },
      });

      expect(updated.scheduleId).toBeUndefined();
      expect(updated).toMatchObject({
        overrideMinimumBookingNotice: null,
        overrideBeforeEventBuffer: null,
        overrideAfterEventBuffer: null,
        overrideSlotInterval: null,
        overrideBookingLimits: Prisma.JsonNull,
        overrideDurationLimits: Prisma.JsonNull,
        overridePeriodType: null,
        overridePeriodStartDate: null,
        overridePeriodEndDate: null,
        overridePeriodDays: null,
        overridePeriodCountCalendarDays: null,
      });
    });

    it("forces isFixed=true for collective scheduling in create and update mappings", () => {
      const collectiveCreate = mapHostCreateData({
        schedulingType: SchedulingType.COLLECTIVE,
        host: {
          userId: 303,
          isFixed: false,
          priority: 2,
          weight: 100,
          groupId: null,
        },
      });

      const collectiveUpdate = mapHostUpdateData({
        schedulingType: SchedulingType.COLLECTIVE,
        host: {
          userId: 303,
          isFixed: false,
          priority: 2,
          weight: 100,
          groupId: null,
        },
      });

      expect(collectiveCreate.isFixed).toBe(true);
      expect(collectiveUpdate.isFixed).toBe(true);
    });
  });
});
