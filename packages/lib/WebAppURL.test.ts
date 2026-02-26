import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/constants", () => ({
  WEBAPP_URL: "https://app.cal.com",
}));

import { WebAppURL } from "./WebAppURL";

describe("WebAppURL", () => {
  it("creates URL with path relative to WEBAPP_URL", () => {
    const url = new WebAppURL("/booking/123");
    expect(url.href).toBe("https://app.cal.com/booking/123");
  });

  it("is instanceof URL", () => {
    const url = new WebAppURL("/test");
    expect(url).toBeInstanceOf(URL);
  });

  it("preserves query parameters", () => {
    const url = new WebAppURL("/booking?id=1&type=group");
    expect(url.searchParams.get("id")).toBe("1");
    expect(url.searchParams.get("type")).toBe("group");
  });

  it("handles root path", () => {
    const url = new WebAppURL("/");
    expect(url.href).toBe("https://app.cal.com/");
  });

  it("accepts URL object as input", () => {
    const input = new URL("https://other.com/path");
    const url = new WebAppURL(input);
    expect(url.href).toBe("https://other.com/path");
  });
});
