import { describe, it, expect } from "vitest";

import { Prisma } from "@calcom/prisma/client";

/**
 * Tests for the bookingFields null handling transformation in update.handler.ts
 *
 * The update handler should convert `bookingFields: null` to `Prisma.DbNull`
 * to properly clear the JSON field in the database.
 *
 * This transformation is necessary because:
 * 1. Prisma requires `Prisma.DbNull` to set a JSON column to database NULL
 * 2. Passing `null` directly would not properly clear the field
 *
 * The transformation logic in update.handler.ts:
 * ```
 * bookingFields:
 *   bookingFields === null ? Prisma.DbNull : (bookingFields as Prisma.InputJsonValue | undefined),
 * ```
 */
describe("bookingFields null to Prisma.DbNull transformation", () => {
  /**
   * Helper function that mirrors the transformation logic in update.handler.ts
   * This allows us to test the transformation in isolation without mocking
   * the entire handler's dependencies.
   */
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
