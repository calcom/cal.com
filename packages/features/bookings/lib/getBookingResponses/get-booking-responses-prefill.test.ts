import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import { test } from "@calcom/testing/lib/fixtures/fixtures";
import { describe, expect } from "vitest";
import type { z } from "zod";

import getBookingResponsesSchema, {
  buildCaseInsensitiveKeyMap,
  getBookingResponsesPartialSchema,
  resolveFieldValueCaseInsensitive,
} from "../getBookingResponsesSchema";

describe("buildCaseInsensitiveKeyMap", () => {
  test("should map each key to its lowercased form", () => {
    const map = buildCaseInsensitiveKeyMap(["attendeePhoneNumber", "email", "name"]);
    expect(map.get("attendeephonenumber")).toEqual({ key: "attendeePhoneNumber", hasConflict: false });
    expect(map.get("email")).toEqual({ key: "email", hasConflict: false });
    expect(map.get("name")).toEqual({ key: "name", hasConflict: false });
  });

  test("should mark conflicting keys when multiple keys share the same lowercase form", () => {
    const map = buildCaseInsensitiveKeyMap(["myField", "MYFIELD"]);
    const entry = map.get("myfield");
    expect(entry).toBeDefined();
    expect(entry?.hasConflict).toBe(true);
  });

  test("should return an empty map for empty input", () => {
    const map = buildCaseInsensitiveKeyMap([]);
    expect(map.size).toBe(0);
  });

  test("should handle keys that are already lowercase", () => {
    const map = buildCaseInsensitiveKeyMap(["email", "company-name"]);
    expect(map.get("email")).toEqual({ key: "email", hasConflict: false });
    expect(map.get("company-name")).toEqual({ key: "company-name", hasConflict: false });
  });

  test("should detect conflict among three keys with the same lowercase form", () => {
    const map = buildCaseInsensitiveKeyMap(["Test", "test", "TEST"]);
    const entry = map.get("test");
    expect(entry).toBeDefined();
    expect(entry?.hasConflict).toBe(true);
  });
});

describe("resolveFieldValueCaseInsensitive", () => {
  test("should return exact match value when key matches exactly", () => {
    const responses = { attendeePhoneNumber: "+911111111111", email: "test@test.com" };
    const keyMap = buildCaseInsensitiveKeyMap(Object.keys(responses));
    const result = resolveFieldValueCaseInsensitive({
      fieldName: "attendeePhoneNumber",
      parsedResponses: responses,
      caseInsensitiveKeyMap: keyMap,
    });
    expect(result).toBe("+911111111111");
  });

  test("should fall back to case-insensitive match when exact match is not found", () => {
    const responses = { attendeephonenumber: "+919999999999" };
    const keyMap = buildCaseInsensitiveKeyMap(Object.keys(responses));
    const result = resolveFieldValueCaseInsensitive({
      fieldName: "attendeePhoneNumber",
      parsedResponses: responses,
      caseInsensitiveKeyMap: keyMap,
    });
    expect(result).toBe("+919999999999");
  });

  test("should return undefined when no match exists", () => {
    const responses = { email: "test@test.com" };
    const keyMap = buildCaseInsensitiveKeyMap(Object.keys(responses));
    const result = resolveFieldValueCaseInsensitive({
      fieldName: "attendeePhoneNumber",
      parsedResponses: responses,
      caseInsensitiveKeyMap: keyMap,
    });
    expect(result).toBeUndefined();
  });

  test("should return undefined when conflicting case-insensitive keys exist and no exact match", () => {
    const responses = { myfield: "value1", MYFIELD: "value2" };
    const keyMap = buildCaseInsensitiveKeyMap(Object.keys(responses));
    const result = resolveFieldValueCaseInsensitive({
      fieldName: "MyField",
      parsedResponses: responses,
      caseInsensitiveKeyMap: keyMap,
    });
    expect(result).toBeUndefined();
  });

  test("should prefer exact match even when case-insensitive match also exists", () => {
    const responses = { attendeephonenumber: "+911111111111", attendeePhoneNumber: "+912222222222" };
    const keyMap = buildCaseInsensitiveKeyMap(Object.keys(responses));
    const result = resolveFieldValueCaseInsensitive({
      fieldName: "attendeePhoneNumber",
      parsedResponses: responses,
      caseInsensitiveKeyMap: keyMap,
    });
    expect(result).toBe("+912222222222");
  });
});

describe("Case-insensitive field matching for routing form prefill", () => {
  test("should match lowercase query param key to camelCase booking field name", async () => {
    const schema = getBookingResponsesPartialSchema({
      bookingFields: [
        {
          name: "name",
          type: "name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          required: true,
        },
        {
          name: "attendeePhoneNumber",
          type: "phone",
          required: false,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    // Routing form sends lowercase key, booking field uses camelCase
    const parsedResponses = await schema.parseAsync({
      attendeephonenumber: "+919999999999",
    });

    expect(parsedResponses).toEqual(
      expect.objectContaining({
        attendeePhoneNumber: "+919999999999",
      })
    );
  });

  test("should prefer exact match over case-insensitive match", async () => {
    const schema = getBookingResponsesPartialSchema({
      bookingFields: [
        {
          name: "name",
          type: "name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          required: true,
        },
        {
          name: "testField",
          type: "text",
          required: false,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    // Exact match should be used when available
    const parsedResponses = await schema.parseAsync({
      testField: "exact value",
    });

    expect(parsedResponses).toEqual(
      expect.objectContaining({
        testField: "exact value",
      })
    );
  });

  test("should fall back to exact match when conflicting case-insensitive keys exist", async () => {
    const schema = getBookingResponsesPartialSchema({
      bookingFields: [
        {
          name: "name",
          type: "name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          required: true,
        },
        {
          name: "attendeePhoneNumber",
          type: "phone",
          required: false,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    // Two query params that differ only by case = conflict, should not case-insensitive match
    const parsedResponses = await schema.parseAsync({
      attendeephonenumber: "+911111111111",
      attendeePhoneNumber: "+912222222222",
    });

    // Should use exact match (attendeePhoneNumber matches exactly)
    expect(parsedResponses).toEqual(
      expect.objectContaining({
        attendeePhoneNumber: "+912222222222",
      })
    );
  });

  test("should not prefill when conflicting case-insensitive keys exist and no exact match", async () => {
    const schema = getBookingResponsesPartialSchema({
      bookingFields: [
        {
          name: "name",
          type: "name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          required: true,
        },
        {
          name: "MyCustomField",
          type: "text",
          required: false,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    // Two query params that differ only by case, neither matches exactly
    const parsedResponses = await schema.parseAsync({
      mycustomfield: "value1",
      MYCUSTOMFIELD: "value2",
    });

    // Neither should match because there's a conflict and no exact match
    expect(parsedResponses).not.toHaveProperty("MyCustomField");
  });

  test("should work with the full schema for exact matches (non-prefill)", async () => {
    const schema = getBookingResponsesSchema({
      bookingFields: [
        {
          name: "name",
          type: "name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          required: true,
        },
        {
          name: "attendeePhoneNumber",
          type: "phone",
          required: true,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    // Full schema with case-insensitive match
    const parsedResponses = await schema.parseAsync({
      name: "John Doe",
      email: "john@example.com",
      attendeephonenumber: "+919999999999",
    });

    expect(parsedResponses).toEqual(
      expect.objectContaining({
        attendeePhoneNumber: "+919999999999",
      })
    );
  });

  test("should handle multiple fields needing case-insensitive matching simultaneously", async () => {
    const schema = getBookingResponsesPartialSchema({
      bookingFields: [
        {
          name: "name",
          type: "name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          required: true,
        },
        {
          name: "attendeePhoneNumber",
          type: "phone",
          required: false,
        },
        {
          name: "companyName",
          type: "text",
          required: false,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    // Routing form sends all-lowercase keys for multiple camelCase booking fields
    const parsedResponses = await schema.parseAsync({
      attendeephonenumber: "+919999999999",
      companyname: "Acme Inc",
    });

    expect(parsedResponses).toEqual(
      expect.objectContaining({
        attendeePhoneNumber: "+919999999999",
        companyName: "Acme Inc",
      })
    );
  });

  test("should handle mix of exact and case-insensitive matches in one form", async () => {
    const schema = getBookingResponsesPartialSchema({
      bookingFields: [
        {
          name: "name",
          type: "name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          required: true,
        },
        {
          name: "attendeePhoneNumber",
          type: "phone",
          required: false,
        },
        {
          name: "company-name",
          type: "text",
          required: false,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    // "company-name" matches exactly (lowercase routing form identifier = lowercase booking field)
    // "attendeephonenumber" needs case-insensitive match to "attendeePhoneNumber"
    const parsedResponses = await schema.parseAsync({
      attendeephonenumber: "+919999999999",
      "company-name": "Acme Inc",
    });

    expect(parsedResponses).toEqual(
      expect.objectContaining({
        attendeePhoneNumber: "+919999999999",
        "company-name": "Acme Inc",
      })
    );
  });

  test("should place case-insensitive matched value under the canonical field name key", async () => {
    const schema = getBookingResponsesPartialSchema({
      bookingFields: [
        {
          name: "name",
          type: "name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          required: true,
        },
        {
          name: "attendeePhoneNumber",
          type: "phone",
          required: false,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    const parsedResponses = await schema.parseAsync({
      attendeephonenumber: "+919999999999",
    });

    // The value must be accessible under the canonical camelCase key
    expect(parsedResponses).toHaveProperty("attendeePhoneNumber", "+919999999999");
  });

  test("should pass phone validation when matched case-insensitively via full schema", async () => {
    const schema = getBookingResponsesSchema({
      bookingFields: [
        {
          name: "name",
          type: "name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          required: true,
        },
        {
          name: "attendeePhoneNumber",
          type: "phone",
          required: true,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    // Valid phone number matched case-insensitively should pass superRefine validation
    const result = await schema.safeParseAsync({
      name: "John Doe",
      email: "john@example.com",
      attendeephonenumber: "+919999999999",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(
        expect.objectContaining({
          attendeePhoneNumber: "+919999999999",
        })
      );
    }
  });

  test("should fail phone validation for invalid number matched case-insensitively via full schema", async () => {
    const schema = getBookingResponsesSchema({
      bookingFields: [
        {
          name: "name",
          type: "name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          required: true,
        },
        {
          name: "attendeePhoneNumber",
          type: "phone",
          required: true,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    // Invalid phone number matched case-insensitively should still fail validation
    const result = await schema.safeParseAsync({
      name: "John Doe",
      email: "john@example.com",
      attendeephonenumber: "not-a-phone",
    });

    expect(result.success).toBe(false);
  });

  test("should gracefully skip invalid case-insensitive match in partial schema", async () => {
    const schema = getBookingResponsesPartialSchema({
      bookingFields: [
        {
          name: "name",
          type: "name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          required: true,
        },
        {
          name: "attendeePhoneNumber",
          type: "phone",
          required: false,
        },
        {
          name: "company-name",
          type: "text",
          required: false,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    // Invalid phone via case-insensitive match, valid text field via exact match
    // Partial schema should skip the invalid phone but keep the valid text
    const parsedResponses = await schema.parseAsync({
      attendeephonenumber: "not-a-phone",
      "company-name": "Acme Inc",
    });

    expect(parsedResponses).toEqual(
      expect.objectContaining({
        "company-name": "Acme Inc",
      })
    );
  });

  test("should handle hidden field with case-insensitive match", async () => {
    const schema = getBookingResponsesPartialSchema({
      bookingFields: [
        {
          name: "name",
          type: "name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          required: true,
        },
        {
          name: "attendeePhoneNumber",
          type: "phone",
          required: false,
          hidden: true,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    // Hidden fields should still receive case-insensitive matched values
    const parsedResponses = await schema.parseAsync({
      attendeephonenumber: "+919999999999",
    });

    expect(parsedResponses).toEqual(
      expect.objectContaining({
        attendeePhoneNumber: "+919999999999",
      })
    );
  });

  test("should handle realistic routing form scenario with system and custom fields", async () => {
    const schema = getBookingResponsesPartialSchema({
      bookingFields: [
        {
          name: "name",
          type: "name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          required: true,
        },
        {
          name: "attendeePhoneNumber",
          type: "phone",
          required: false,
        },
        {
          name: "company-name",
          type: "text",
          required: false,
        },
        {
          name: "budget-range",
          type: "text",
          required: false,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    // Simulates what a routing form sends:
    // - name/email: standard system fields (exact match, lowercase)
    // - attendeephonenumber: lowercase from routing form, needs case-insensitive match
    // - company-name: custom field, exact match (both sides lowercase with hyphens)
    // - budget-range: custom field, exact match
    const parsedResponses = await schema.parseAsync({
      name: "John Doe",
      email: "john@example.com",
      attendeephonenumber: "+919999999999",
      "company-name": "Acme Inc",
      "budget-range": "$10k-$50k",
    });

    expect(parsedResponses).toEqual(
      expect.objectContaining({
        name: "John Doe",
        email: "john@example.com",
        attendeePhoneNumber: "+919999999999",
        "company-name": "Acme Inc",
        "budget-range": "$10k-$50k",
      })
    );
  });
});
