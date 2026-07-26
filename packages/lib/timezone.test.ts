import { describe, expect, it } from "vitest";

import { formatOffset } from "./timezone";

describe("fn: formatOffset", () => {
  it("should drop the padding zero from whole-hour offsets", () => {
    expect(formatOffset("+01:00")).toEqual("+1:00");
    expect(formatOffset("+09:00")).toEqual("+9:00");
    expect(formatOffset("-04:00")).toEqual("-4:00");
    expect(formatOffset("-08:00")).toEqual("-8:00");
  });

  it("should drop the padding zero from half and quarter hour offsets", () => {
    // Previously these kept their leading zero, so the dropdown mixed
    // "GMT +05:30" with "GMT +9:00".
    expect(formatOffset("+05:30")).toEqual("+5:30"); // India, Sri Lanka
    expect(formatOffset("+05:45")).toEqual("+5:45"); // Nepal
    expect(formatOffset("+09:30")).toEqual("+9:30"); // Adelaide
    expect(formatOffset("+03:30")).toEqual("+3:30"); // Iran
    expect(formatOffset("+06:30")).toEqual("+6:30"); // Myanmar
    expect(formatOffset("-03:30")).toEqual("-3:30"); // Newfoundland
  });

  it("should leave two-digit hour offsets alone", () => {
    expect(formatOffset("+12:45")).toEqual("+12:45"); // Chatham Islands
    expect(formatOffset("+13:00")).toEqual("+13:00");
    expect(formatOffset("-11:00")).toEqual("-11:00");
    expect(formatOffset("+14:00")).toEqual("+14:00"); // Kiritimati, the extreme
  });

  it("should use one format for every offset", () => {
    const offsets = ["+01:00", "+05:30", "+05:45", "+09:00", "-04:00", "-03:30"];

    for (const offset of offsets) {
      // A single-digit hour never keeps its padding zero.
      expect(formatOffset(offset), offset).not.toMatch(/^[-+]0\d/);
    }
  });

  it("should leave anything that isn't an offset untouched", () => {
    expect(formatOffset("+00:00")).toEqual("+0:00");
    expect(formatOffset("Z")).toEqual("Z");
    expect(formatOffset("")).toEqual("");
  });
});
