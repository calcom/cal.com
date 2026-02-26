import type { RecurringEvent } from "@calcom/types/Calendar";
import { describe, expect, it, vi } from "vitest";
import { getEveryFreqFor, getRecurringFreq } from "./recurringStrings";

const mockT = vi.fn((key: string, opts?: Record<string, unknown>) => {
  if (key === "every_for_freq") return `every ${opts?.freq}`;
  if (key === "occurrence") {
    return opts?.count === 1 ? "occurrence" : "occurrences";
  }
  if (opts?.count && Number(opts.count) > 1) return `${key}s`;
  return key;
});

const createRecurringEvent = (overrides: Partial<RecurringEvent> = {}): RecurringEvent => ({
  freq: 2,
  count: 10,
  interval: 1,
  ...overrides,
});

describe("getRecurringFreq", () => {
  it("returns frequency string for weekly recurrence with interval 1", () => {
    const recurringEvent = createRecurringEvent({ freq: 2, interval: 1 });
    const result = getRecurringFreq({
      t: mockT as unknown as Parameters<typeof getRecurringFreq>[0]["t"],
      recurringEvent,
    });

    expect(result).toContain("every");
    expect(result).toContain("weekly");
  });

  it("returns frequency string for weekly recurrence with interval > 1", () => {
    const recurringEvent = createRecurringEvent({ freq: 2, interval: 2 });
    const result = getRecurringFreq({
      t: mockT as unknown as Parameters<typeof getRecurringFreq>[0]["t"],
      recurringEvent,
    });

    expect(result).toContain("every");
    expect(result).toContain("2");
  });

  it("returns frequency string for daily recurrence", () => {
    const recurringEvent = createRecurringEvent({ freq: 3, interval: 1 });
    const result = getRecurringFreq({
      t: mockT as unknown as Parameters<typeof getRecurringFreq>[0]["t"],
      recurringEvent,
    });

    expect(result).toContain("every");
    expect(result).toContain("daily");
  });

  it("returns frequency string for monthly recurrence", () => {
    const recurringEvent = createRecurringEvent({ freq: 1, interval: 1 });
    const result = getRecurringFreq({
      t: mockT as unknown as Parameters<typeof getRecurringFreq>[0]["t"],
      recurringEvent,
    });

    expect(result).toContain("every");
    expect(result).toContain("monthly");
  });

  it("returns frequency string for yearly recurrence", () => {
    const recurringEvent = createRecurringEvent({ freq: 0, interval: 1 });
    const result = getRecurringFreq({
      t: mockT as unknown as Parameters<typeof getRecurringFreq>[0]["t"],
      recurringEvent,
    });

    expect(result).toContain("every");
    expect(result).toContain("yearly");
  });

  it("returns empty string when interval is falsy", () => {
    const recurringEvent = createRecurringEvent({ freq: 2, interval: 0 });
    const result = getRecurringFreq({
      t: mockT as unknown as Parameters<typeof getRecurringFreq>[0]["t"],
      recurringEvent,
    });

    expect(result).toBe("");
  });
});

describe("getEveryFreqFor", () => {
  it("returns full recurrence string with count from recurringEvent", () => {
    const recurringEvent = createRecurringEvent({ freq: 2, count: 10, interval: 1 });
    const result = getEveryFreqFor({
      t: mockT as unknown as Parameters<typeof getEveryFreqFor>[0]["t"],
      recurringEvent,
    });

    expect(result).toContain("10");
    expect(result).toContain("occurrences");
  });

  it("uses provided recurringCount over recurringEvent.count", () => {
    const recurringEvent = createRecurringEvent({ freq: 2, count: 10, interval: 1 });
    const result = getEveryFreqFor({
      t: mockT as unknown as Parameters<typeof getEveryFreqFor>[0]["t"],
      recurringEvent,
      recurringCount: 5,
    });

    expect(result).toContain("5");
    expect(result).toContain("occurrences");
  });

  it("uses provided recurringFreq over computed frequency", () => {
    const recurringEvent = createRecurringEvent({ freq: 2, count: 3, interval: 1 });
    const result = getEveryFreqFor({
      t: mockT as unknown as Parameters<typeof getEveryFreqFor>[0]["t"],
      recurringEvent,
      recurringFreq: "every week",
    });

    expect(result).toContain("every week");
    expect(result).toContain("3");
  });

  it("returns empty string when freq is null/undefined", () => {
    const recurringEvent = createRecurringEvent({
      freq: undefined as unknown as number,
      count: 10,
      interval: 1,
    });
    const result = getEveryFreqFor({
      t: mockT as unknown as Parameters<typeof getEveryFreqFor>[0]["t"],
      recurringEvent,
    });

    expect(result).toBe("");
  });
});
