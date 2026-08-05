import { describe, expect, it } from "vitest";

import { handleOptionLabel } from "./timezone";

describe("timezone handleOptionLabel formatOffset", () => {
  it("strips leading zeros for single-digit whole-hour and non-whole-hour offsets", () => {
    const mockOptionWholeHour = {
      label: "(GMT+09:00) Tokyo",
      value: "Asia/Tokyo",
      offset: 9,
    };

    const mockOptionHalfHour = {
      label: "(GMT+05:30) Kolkata",
      value: "Asia/Kolkata",
      offset: 5.5,
    };

    const mockOptionQuarterHour = {
      label: "(GMT+05:45) Kathmandu",
      value: "Asia/Kathmandu",
      offset: 5.75,
    };

    const resultWhole = handleOptionLabel(mockOptionWholeHour, [
      { label: "Tokyo", timezone: "Asia/Tokyo" },
    ]);
    expect(resultWhole).toContain("+9:00");

    const resultHalf = handleOptionLabel(mockOptionHalfHour, [
      { label: "Kolkata", timezone: "Asia/Kolkata" },
    ]);
    expect(resultHalf).toContain("+5:30");

    const resultQuarter = handleOptionLabel(mockOptionQuarterHour, [
      { label: "Kathmandu", timezone: "Asia/Kathmandu" },
    ]);
    expect(resultQuarter).toContain("+5:45");
  });
});
