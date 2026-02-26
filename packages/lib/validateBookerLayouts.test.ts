import { describe, expect, it } from "vitest";

import { BookerLayouts } from "@calcom/prisma/zod-utils";

import { validateBookerLayouts } from "./validateBookerLayouts";

describe("validateBookerLayouts", () => {
  it("returns undefined for null settings (database default)", () => {
    expect(validateBookerLayouts(null)).toBeUndefined();
  });

  it("returns undefined for valid settings with all layouts enabled", () => {
    const result = validateBookerLayouts({
      enabledLayouts: [BookerLayouts.MONTH_VIEW, BookerLayouts.WEEK_VIEW, BookerLayouts.COLUMN_VIEW],
      defaultLayout: BookerLayouts.MONTH_VIEW,
    });
    expect(result).toBeUndefined();
  });

  it("returns undefined when default is among enabled layouts", () => {
    const result = validateBookerLayouts({
      enabledLayouts: [BookerLayouts.WEEK_VIEW],
      defaultLayout: BookerLayouts.WEEK_VIEW,
    });
    expect(result).toBeUndefined();
  });

  it("returns error when no layouts are enabled", () => {
    const result = validateBookerLayouts({
      enabledLayouts: [],
      defaultLayout: BookerLayouts.MONTH_VIEW,
    });
    expect(result).toBe("bookerlayout_error_min_one_enabled");
  });

  it("returns error when default layout is not in enabled layouts", () => {
    const result = validateBookerLayouts({
      enabledLayouts: [BookerLayouts.MONTH_VIEW],
      defaultLayout: BookerLayouts.WEEK_VIEW,
    });
    expect(result).toBe("bookerlayout_error_default_not_enabled");
  });

  it("returns error when enabled layouts contain unknown layout", () => {
    const result = validateBookerLayouts({
      enabledLayouts: ["unknown_layout" as BookerLayouts, BookerLayouts.MONTH_VIEW],
      defaultLayout: BookerLayouts.MONTH_VIEW,
    });
    expect(result).toBe("bookerlayout_error_unknown_layout");
  });

  it("returns error when default layout is unknown", () => {
    const result = validateBookerLayouts({
      enabledLayouts: [BookerLayouts.MONTH_VIEW],
      defaultLayout: "unknown_default" as BookerLayouts,
    });
    // Default not in enabled layouts triggers first
    expect(result).toBe("bookerlayout_error_default_not_enabled");
  });
});
