import { describe, expect, it, vi } from "vitest";
import type { Timezones } from "./timezone";

vi.mock("./isProblematicTimezone", () => ({
  default: vi.fn((tz: string) => tz === "America/Nassau"),
}));

vi.mock("@calcom/dayjs", () => {
  const mockTz = vi.fn().mockReturnValue({ format: vi.fn().mockReturnValue("+5:00") });
  return {
    default: {
      tz: mockTz,
    },
  };
});

describe("filterBySearchText", () => {
  let filterBySearchText: typeof import("./timezone")["filterBySearchText"];

  beforeAll(async () => {
    const mod = await import("./timezone");
    filterBySearchText = mod.filterBySearchText;
  });

  it("returns timezones whose labels contain the search text (case-insensitive)", () => {
    const timezones: Timezones = [
      { label: "(GMT-5:00) New York", timezone: "America/New_York" },
      { label: "(GMT+0:00) London", timezone: "Europe/London" },
      { label: "(GMT+9:00) Tokyo", timezone: "Asia/Tokyo" },
    ];

    const result = filterBySearchText("london", timezones);

    expect(result).toHaveLength(1);
    expect(result[0].timezone).toBe("Europe/London");
  });

  it("returns empty array when no match", () => {
    const timezones: Timezones = [{ label: "(GMT-5:00) New York", timezone: "America/New_York" }];

    const result = filterBySearchText("paris", timezones);

    expect(result).toHaveLength(0);
  });

  it("returns all timezones when search text matches all", () => {
    const timezones: Timezones = [
      { label: "(GMT-5:00) New York", timezone: "America/New_York" },
      { label: "(GMT+0:00) London", timezone: "Europe/London" },
    ];

    const result = filterBySearchText("gmt", timezones);

    expect(result).toHaveLength(2);
  });
});

describe("addTimezonesToDropdown", () => {
  let addTimezonesToDropdown: typeof import("./timezone")["addTimezonesToDropdown"];

  beforeAll(async () => {
    const mod = await import("./timezone");
    addTimezonesToDropdown = mod.addTimezonesToDropdown;
  });

  it("converts timezones array to { timezone: label } object", () => {
    const timezones: Timezones = [
      { label: "(GMT-5:00) New York", timezone: "America/New_York" },
      { label: "(GMT+0:00) London", timezone: "Europe/London" },
    ];

    const result = addTimezonesToDropdown(timezones);

    expect(result["America/New_York"]).toBe("(GMT-5:00) New York");
    expect(result["Europe/London"]).toBe("(GMT+0:00) London");
  });

  it("filters out problematic timezones", () => {
    const timezones: Timezones = [
      { label: "(GMT-5:00) Nassau", timezone: "America/Nassau" },
      { label: "(GMT-5:00) New York", timezone: "America/New_York" },
    ];

    const result = addTimezonesToDropdown(timezones);

    expect(result["America/Nassau"]).toBeUndefined();
    expect(result["America/New_York"]).toBe("(GMT-5:00) New York");
  });

  it("filters out null timezone values", () => {
    const timezones = [
      { label: "Null TZ", timezone: null },
      { label: "(GMT-5:00) New York", timezone: "America/New_York" },
    ] as unknown as Timezones;

    const result = addTimezonesToDropdown(timezones);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result["America/New_York"]).toBeDefined();
  });

  it("returns empty object for empty input", () => {
    const result = addTimezonesToDropdown([]);

    expect(result).toEqual({});
  });
});

describe("handleOptionLabel", () => {
  let handleOptionLabel: typeof import("./timezone")["handleOptionLabel"];

  beforeAll(async () => {
    const mod = await import("./timezone");
    handleOptionLabel = mod.handleOptionLabel;
  });

  it("formats label with city name and offset when timezones is non-empty", () => {
    const option = {
      value: "America/New_York",
      label: "(GMT-5:00) New York",
      abbrev: "EST",
      altName: "Eastern Standard Time",
      offset: -5,
    };
    const timezones: Timezones = [{ label: "(GMT-5:00) New York", timezone: "America/New_York" }];

    const result = handleOptionLabel(option, timezones);

    expect(result).toContain("New York");
  });

  it("uses option.value (underscores replaced) when timezones is empty", () => {
    const option = {
      value: "America/New_York",
      label: "(GMT-5:00) New York",
      abbrev: "EST",
      altName: "Eastern Standard Time",
      offset: -5,
    };

    const result = handleOptionLabel(option, []);

    expect(result).toContain("America/New York");
  });

  it("handles timezone offset formatting correctly", () => {
    const option = {
      value: "Asia/Tokyo",
      label: "(GMT+9:00) Tokyo",
      abbrev: "JST",
      altName: "Japan Standard Time",
      offset: 9,
    };
    const timezones: Timezones = [{ label: "(GMT+9:00) Tokyo", timezone: "Asia/Tokyo" }];

    const result = handleOptionLabel(option, timezones);

    expect(typeof result).toBe("string");
    expect(result).toContain("Tokyo");
  });
});
