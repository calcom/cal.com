import { Prisma } from "@calcom/prisma/client";
import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { normalizeOptionalGuestTeamMemberIds } from "./update.handler";

describe("update.handler", () => {
  describe("normalizeOptionalGuestTeamMemberIds", () => {
    it("returns undefined when optional guest ids are not provided", () => {
      const result = normalizeOptionalGuestTeamMemberIds({
        optionalGuestTeamMemberIds: undefined,
        teamId: 1,
        acceptedTeamMemberIds: [1, 2, 3],
      });

      expect(result).toBeUndefined();
    });

    it("deduplicates optional guest ids while preserving order", () => {
      const result = normalizeOptionalGuestTeamMemberIds({
        optionalGuestTeamMemberIds: [3, 2, 3, 1, 2],
        teamId: 1,
        acceptedTeamMemberIds: [1, 2, 3],
      });

      expect(result).toEqual([3, 2, 1]);
    });

    it("throws BAD_REQUEST for non-team event types", () => {
      try {
        normalizeOptionalGuestTeamMemberIds({
          optionalGuestTeamMemberIds: [1],
          teamId: undefined,
          acceptedTeamMemberIds: [1, 2],
        });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("BAD_REQUEST");
        return;
      }

      throw new Error("Expected TRPCError to be thrown");
    });

    it("throws FORBIDDEN when a member id does not belong to the team", () => {
      try {
        normalizeOptionalGuestTeamMemberIds({
          optionalGuestTeamMemberIds: [1, 4],
          teamId: 1,
          acceptedTeamMemberIds: [1, 2, 3],
        });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("FORBIDDEN");
        return;
      }

      throw new Error("Expected TRPCError to be thrown");
    });
  });

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
