import { describe, it, expect } from "vitest";

import { Prisma } from "@calcom/prisma/client";

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

  describe("instantMeetingSchedule connect/disconnect logic", () => {
    type ScheduleAction = { connect: { id: number } } | { disconnect: true } | undefined;

    function getInstantMeetingScheduleAction(
      instantMeetingSchedule: number | null | undefined,
      schedule: number | null | undefined
    ): ScheduleAction {
      if (instantMeetingSchedule) {
        return {
          connect: {
            id: instantMeetingSchedule,
          },
        };
      } else if (instantMeetingSchedule === null || schedule === null) {
        return {
          disconnect: true,
        };
      }
      return undefined;
    }

    it("should connect when instantMeetingSchedule is a valid ID", () => {
      const result = getInstantMeetingScheduleAction(42, undefined);
      expect(result).toEqual({ connect: { id: 42 } });
    });

    it("should disconnect when instantMeetingSchedule is explicitly null", () => {
      const result = getInstantMeetingScheduleAction(null, undefined);
      expect(result).toEqual({ disconnect: true });
    });

    it("should disconnect when schedule is null (even if instantMeetingSchedule is undefined)", () => {
      const result = getInstantMeetingScheduleAction(undefined, null);
      expect(result).toEqual({ disconnect: true });
    });

    it("should disconnect when both instantMeetingSchedule and schedule are null", () => {
      const result = getInstantMeetingScheduleAction(null, null);
      expect(result).toEqual({ disconnect: true });
    });

    it("should return undefined when both are undefined (no action needed)", () => {
      const result = getInstantMeetingScheduleAction(undefined, undefined);
      expect(result).toBeUndefined();
    });

    it("should connect when instantMeetingSchedule has a value regardless of schedule", () => {
      const result = getInstantMeetingScheduleAction(10, null);
      expect(result).toEqual({ connect: { id: 10 } });
    });
  });
});
