import { describe, expect, it } from "vitest";

import { getMultipleDurationValue } from "./get-booking";

describe("getMultipleDurationValue", () => {
  it("falls back to event type default when duration query param is missing", () => {
    const result = getMultipleDurationValue([15, 30, 60], undefined, 30);

    expect(result).toBe(30);
  });
});
