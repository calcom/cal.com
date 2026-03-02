import { describe, expect, it } from "vitest";

import { validStatuses } from "./validStatuses";

describe("validStatuses", () => {
  it("contains exactly 5 statuses", () => {
    expect(validStatuses).toHaveLength(5);
  });

  it("includes upcoming", () => {
    expect(validStatuses).toContain("upcoming");
  });

  it("includes recurring", () => {
    expect(validStatuses).toContain("recurring");
  });

  it("includes past", () => {
    expect(validStatuses).toContain("past");
  });

  it("includes cancelled", () => {
    expect(validStatuses).toContain("cancelled");
  });

  it("includes unconfirmed", () => {
    expect(validStatuses).toContain("unconfirmed");
  });

  it("is a readonly tuple", () => {
    // Verify the order is deterministic
    expect(validStatuses[0]).toBe("upcoming");
    expect(validStatuses[1]).toBe("recurring");
    expect(validStatuses[2]).toBe("past");
    expect(validStatuses[3]).toBe("cancelled");
    expect(validStatuses[4]).toBe("unconfirmed");
  });
});
