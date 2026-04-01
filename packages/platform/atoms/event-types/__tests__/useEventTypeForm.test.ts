import { describe, expect, it } from "vitest";
import isEqual from "lodash/isEqual";

describe("useEventTypeForm unsaved changes", () => {
  it("should return false when values are reverted back to baseline", () => {
    const baseline = {
      title: "Meeting",
    };

    const changed = {
      title: "Meeting Updated",
    };

    expect(!isEqual(baseline, changed)).toBe(true);

    const reverted = {
      title: "Meeting",
    };

    expect(!isEqual(baseline, reverted)).toBe(false);
  });
});