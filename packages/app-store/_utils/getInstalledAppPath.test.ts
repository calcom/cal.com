import { describe, it, expect } from "vitest";

import getInstalledAppPath from "./getInstalledAppPath";

describe("getInstalledAppPath", () => {
  it("should return /apps/installed when no variant provided", () => {
    expect(getInstalledAppPath({})).toBe("/apps/installed");
  });

  it("should return /apps/installed for invalid variant", () => {
    expect(getInstalledAppPath({ variant: "invalid_variant_xyz" })).toBe("/apps/installed");
  });

  it("should return /apps/installed/{variant} for valid variant without slug", () => {
    expect(getInstalledAppPath({ variant: "calendar" })).toBe("/apps/installed/calendar");
  });

  it("should return path with ?hl= param for valid variant and slug", () => {
    expect(getInstalledAppPath({ variant: "calendar", slug: "google-calendar" })).toBe(
      "/apps/installed/calendar?hl=google-calendar"
    );
  });

  it("should append locationSearch correctly", () => {
    expect(getInstalledAppPath({}, "&foo=bar")).toBe("/apps/installed&foo=bar");
  });
});
