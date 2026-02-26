import { describe, expect, it } from "vitest";

import findDurationType from "./findDurationType";

describe("findDurationType", () => {
  it("returns 'days' for values divisible by 1440 (minutes in a day)", () => {
    expect(findDurationType(1440)).toBe("days");
    expect(findDurationType(2880)).toBe("days"); // 2 days
    expect(findDurationType(4320)).toBe("days"); // 3 days
  });

  it("returns 'hours' for values divisible by 60 but not by 1440", () => {
    expect(findDurationType(60)).toBe("hours");
    expect(findDurationType(120)).toBe("hours"); // 2 hours
    expect(findDurationType(180)).toBe("hours"); // 3 hours
    expect(findDurationType(660)).toBe("hours"); // 11 hours
  });

  it("returns 'minutes' for values not divisible by 60", () => {
    expect(findDurationType(15)).toBe("minutes");
    expect(findDurationType(30)).toBe("minutes");
    expect(findDurationType(45)).toBe("minutes");
    expect(findDurationType(90)).toBe("minutes"); // 90 % 60 === 30, not divisible
  });

  it("returns 'minutes' for odd minute values", () => {
    expect(findDurationType(1)).toBe("minutes");
    expect(findDurationType(7)).toBe("minutes");
    expect(findDurationType(25)).toBe("minutes");
    expect(findDurationType(59)).toBe("minutes");
  });

  it("returns 'days' for 0 (0 is divisible by any number)", () => {
    // 0 % 1440 === 0, so it returns "days"
    expect(findDurationType(0)).toBe("days");
  });
});
