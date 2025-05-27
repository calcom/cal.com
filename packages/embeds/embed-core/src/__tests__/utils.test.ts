import { describe, expect, it } from "vitest";

import { generateDataAttributes, isSameBookingLink } from "../utils";

describe("generateDataAttributes", () => {
  it("should handle PascalCase property names correctly", () => {
    const props = {
      TestKey: "testValue",
      AnotherKey: "anotherValue",
    };

    expect(generateDataAttributes(props)).toBe('data-test-key="testValue" data-another-key="anotherValue"');
  });

  it("should handle camelCase property names correctly", () => {
    const props = {
      camelCaseKey: "value",
      superLongCamelCaseKey: "test",
    };

    expect(generateDataAttributes(props)).toBe(
      'data-camel-case-key="value" data-super-long-camel-case-key="test"'
    );
  });

  it("should filter out null and undefined values", () => {
    const props = {
      validKey: "value",
      nullKey: null,
      undefinedKey: undefined,
    };

    expect(generateDataAttributes(props)).toBe('data-valid-key="value"');
  });

  it("should return empty string for empty object", () => {
    const props = {};

    expect(generateDataAttributes(props)).toBe("");
  });

  it("should handle object with all null/undefined values", () => {
    const props = {
      key1: null,
      key2: undefined,
    };

    expect(generateDataAttributes(props)).toBe("");
  });

  it("should escape special characters in attribute values", () => {
    const props = {
      testKey: "<script>alert('XSS')</script>",
      testKey2: '<script>alert("XSS")</script>',
    };

    expect(generateDataAttributes(props)).toBe(
      'data-test-key="&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;" data-test-key2="&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"'
    );
  });
});

describe("isSameBookingLink", () => {
  it("should return true for same booking link", () => {
    expect(
      isSameBookingLink({
        bookingLinkPath1: "/team/event-booking-url",
        bookingLinkPath2: "/team/event-booking-url",
      })
    ).toBe(true);
    expect(
      isSameBookingLink({
        bookingLinkPath1: "/team/team1/event-booking-url",
        bookingLinkPath2: "/team/team1/event-booking-url",
      })
    ).toBe(true);
  });

  it("should return false for different booking links", () => {
    expect(
      isSameBookingLink({
        bookingLinkPath1: "/team/event-booking-url",
        bookingLinkPath2: "/team/event-booking-url-2",
      })
    ).toBe(false);
  });

  it("should return true for same booking links with /team prefix in them", () => {
    expect(isSameBookingLink({ bookingLinkPath1: "/team/sales/demo", bookingLinkPath2: "/sales/demo" })).toBe(
      true
    );
    expect(
      isSameBookingLink({
        bookingLinkPath1: "/team1/event-booking-url",
        bookingLinkPath2: "/team/team1/event-booking-url",
      })
    ).toBe(true);
  });
});
