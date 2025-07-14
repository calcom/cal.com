import { describe, expect, it } from "vitest";

import { getNewSearchParams } from "./bookingSuccessRedirect";

describe("getNewSearchParams", () => {
  it("should remove 'embed' param when isEmbed is true", () => {
    const searchParams = new URLSearchParams({ embed: "true", foo: "bar" });
    const query = { bookingId: "123" };

    const result = getNewSearchParams({ query, searchParams, isEmbed: true });

    expect(result.get("embed")).toBeNull();
    expect(result.get("foo")).toBe("bar");
    expect(result.get("bookingId")).toBe("123");
  });

  it("should keep 'embed' param when isEmbed is false", () => {
    const searchParams = new URLSearchParams({ embed: "true", foo: "bar" });
    const query = { bookingId: "456" };

    const result = getNewSearchParams({ query, searchParams, isEmbed: false });

    expect(result.get("embed")).toBe("true");
    expect(result.get("foo")).toBe("bar");
    expect(result.get("bookingId")).toBe("456");
  });
});
