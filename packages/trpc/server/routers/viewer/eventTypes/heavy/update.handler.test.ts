import { Prisma } from "@calcom/prisma/client";
import { describe, expect, it } from "vitest";

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
});
