import { describe, expect, it } from "vitest";

import { DEFAULT_HOLIDAY_EMOJI, HOLIDAY_EMOJI_MAP, getHolidayEmoji } from "./getHolidayEmoji";

describe("getHolidayEmoji", () => {
  it("returns Christmas tree for 'Christmas Day'", () => {
    expect(getHolidayEmoji("Christmas Day")).toBe("🎄");
  });

  it("returns turkey for 'Thanksgiving'", () => {
    expect(getHolidayEmoji("Thanksgiving")).toBe("🦃");
  });

  it("returns fireworks for 'Independence Day'", () => {
    expect(getHolidayEmoji("Independence Day")).toBe("🎆");
  });

  it("returns egg for 'Easter Monday'", () => {
    expect(getHolidayEmoji("Easter Monday")).toBe("🐣");
  });

  it("returns lamp for 'Diwali'", () => {
    expect(getHolidayEmoji("Diwali")).toBe("🪔");
  });

  it("returns menorah for 'Hanukkah'", () => {
    expect(getHolidayEmoji("Hanukkah")).toBe("🕎");
  });

  it("returns crescent for 'Eid al-Fitr'", () => {
    expect(getHolidayEmoji("Eid al-Fitr")).toBe("🌙");
  });

  it("is case-insensitive", () => {
    expect(getHolidayEmoji("CHRISTMAS DAY")).toBe("🎄");
    expect(getHolidayEmoji("thanksgiving")).toBe("🦃");
    expect(getHolidayEmoji("EASTER")).toBe("🐣");
  });

  it("matches partial keywords in holiday name", () => {
    expect(getHolidayEmoji("Merry Christmas Eve")).toBe("🎄");
    expect(getHolidayEmoji("US Independence Day")).toBe("🎆");
  });

  it("returns default emoji for unrecognized holidays", () => {
    expect(getHolidayEmoji("Random Day Off")).toBe(DEFAULT_HOLIDAY_EMOJI);
    expect(getHolidayEmoji("")).toBe(DEFAULT_HOLIDAY_EMOJI);
  });

  it("handles multilingual keywords", () => {
    expect(getHolidayEmoji("Navidad")).toBe("🎄"); // Spanish Christmas
    expect(getHolidayEmoji("Día del Padre")).toBe("👔"); // Spanish Father's Day
    expect(getHolidayEmoji("Fête des Mères")).toBe("💐"); // French Mother's Day
    expect(getHolidayEmoji("Noël")).toBe("🎄"); // French Christmas
  });

  it("matches worker emoji for Labor Day variants", () => {
    expect(getHolidayEmoji("Labor Day")).toBe("👷");
    expect(getHolidayEmoji("Labour Day")).toBe("👷");
    expect(getHolidayEmoji("May Day")).toBe("👷");
    expect(getHolidayEmoji("Tag der Arbeit")).toBe("👷");
  });

  it("matches dragon for Chinese New Year", () => {
    expect(getHolidayEmoji("Chinese New Year")).toBe("🐉");
    expect(getHolidayEmoji("Lunar New Year")).toBe("🐉");
  });

  it("returns fireworks for New Year (not Chinese)", () => {
    expect(getHolidayEmoji("New Year's Day")).toBe("🎆");
  });
});

describe("HOLIDAY_EMOJI_MAP", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(HOLIDAY_EMOJI_MAP)).toBe(true);
    expect(HOLIDAY_EMOJI_MAP.length).toBeGreaterThan(50);
  });

  it("each entry has keywords array and emoji string", () => {
    for (const entry of HOLIDAY_EMOJI_MAP) {
      expect(Array.isArray(entry.keywords)).toBe(true);
      expect(entry.keywords.length).toBeGreaterThan(0);
      expect(typeof entry.emoji).toBe("string");
      expect(entry.emoji.length).toBeGreaterThan(0);
    }
  });
});

describe("DEFAULT_HOLIDAY_EMOJI", () => {
  it("is the calendar emoji", () => {
    expect(DEFAULT_HOLIDAY_EMOJI).toBe("📆");
  });
});
