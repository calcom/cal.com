import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/constants", async () => {
  const actual = await vi.importActual<typeof import("@calcom/lib/constants")>("@calcom/lib/constants");
  return {
    ...actual,
    IS_SELF_HOSTED: false,
  };
});

import { doWeNeedCalOriginProp } from "./EmbedCodes";

describe("doWeNeedCalOriginProp", () => {
  it("returns false for default cloud origin app.cal.com", () => {
    expect(doWeNeedCalOriginProp("https://app.cal.com")).toBe(false);
  });

  it("returns false for default cloud website origin cal.com", () => {
    expect(doWeNeedCalOriginProp("https://cal.com")).toBe(false);
  });

  it("returns true for non-default cloud origins like app.cal.eu", () => {
    expect(doWeNeedCalOriginProp("https://app.cal.eu")).toBe(true);
  });

  it("handles trailing slash in origin values", () => {
    expect(doWeNeedCalOriginProp("https://app.cal.com/")).toBe(false);
  });
});
