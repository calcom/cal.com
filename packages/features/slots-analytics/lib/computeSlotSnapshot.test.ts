import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeSlotSnapshot } from "./computeSlotSnapshot";

describe("computeSlotSnapshot", () => {
  const NOW = new Date("2026-02-23T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns null when not sampled (random >= sampleRate)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const slots = {
      "2026-02-24": [{ time: "2026-02-24T09:00:00Z" }],
    };

    expect(computeSlotSnapshot(slots, 123, 0.3)).toBeNull();
  });

  it("returns snapshot when sampled (random < sampleRate)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);

    const slots = {
      "2026-02-24": [{ time: "2026-02-24T09:00:00Z" }],
    };

    const result = computeSlotSnapshot(slots, 123, 0.3);
    expect(result).not.toBeNull();
    expect(result?.eventTypeId).toBe(123);
    // 21 hours = 1260 minutes from noon to 9am next day
    expect(result?.firstSlotLeadTime).toBe(1260);
  });

  it("returns null when slots map is empty", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);

    expect(computeSlotSnapshot({}, 123, 0.3)).toBeNull();
  });

  it("returns null when first date has no slots", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);

    const slots = {
      "2026-02-24": [],
    };

    expect(computeSlotSnapshot(slots, 123, 0.3)).toBeNull();
  });

  it("returns null when first slot has no time", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);

    const slots = {
      "2026-02-24": [{ time: "" }],
    };

    expect(computeSlotSnapshot(slots, 123, 0.3)).toBeNull();
  });

  it("returns null when lead time is negative (slot in the past)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);

    const slots = {
      "2026-02-22": [{ time: "2026-02-22T09:00:00Z" }],
    };

    expect(computeSlotSnapshot(slots, 123, 0.3)).toBeNull();
  });

  it("sorts dates to find the earliest slot", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);

    const slots = {
      "2026-02-25": [{ time: "2026-02-25T09:00:00Z" }],
      "2026-02-24": [{ time: "2026-02-24T09:00:00Z" }],
    };

    const result = computeSlotSnapshot(slots, 123, 0.3);
    expect(result).not.toBeNull();
    // Should pick 2026-02-24 (earlier date), 21 hours = 1260 minutes
    expect(result?.firstSlotLeadTime).toBe(1260);
  });

  it("uses default sample rate of 0.3", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.29);

    const slots = {
      "2026-02-24": [{ time: "2026-02-24T09:00:00Z" }],
    };

    const result = computeSlotSnapshot(slots, 123);
    expect(result).not.toBeNull();
  });

  it("returns 0 lead time when slot is exactly now", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);

    const slots = {
      "2026-02-23": [{ time: "2026-02-23T12:00:00Z" }],
    };

    const result = computeSlotSnapshot(slots, 456, 1.0);
    expect(result).not.toBeNull();
    expect(result?.firstSlotLeadTime).toBe(0);
  });

  it("correctly rounds lead time to nearest minute", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);

    // 30 seconds into the future = rounds to 1 minute
    const slotTime = new Date(NOW + 30 * 1000).toISOString();
    const slots = {
      "2026-02-23": [{ time: slotTime }],
    };

    const result = computeSlotSnapshot(slots, 123, 1.0);
    expect(result).not.toBeNull();
    expect(result?.firstSlotLeadTime).toBe(1);
  });

  it("uses sampleRate of 1.0 to always sample", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    const slots = {
      "2026-02-24": [{ time: "2026-02-24T09:00:00Z" }],
    };

    const result = computeSlotSnapshot(slots, 123, 1.0);
    expect(result).not.toBeNull();
  });

  it("uses sampleRate of 0 to never sample", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.0);

    const slots = {
      "2026-02-24": [{ time: "2026-02-24T09:00:00Z" }],
    };

    expect(computeSlotSnapshot(slots, 123, 0)).toBeNull();
  });
});
