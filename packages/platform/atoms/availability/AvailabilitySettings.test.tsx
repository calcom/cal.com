import { describe, it, expect } from "vitest";

import type { AvailabilityFormValues } from "./types";

/**
 * Tests the formHasChanges comparison logic extracted from AvailabilitySettings.
 * The original bug (#26708) was that `initialValuesRef.current.availability` was used
 * instead of `initialValuesRef.current.schedule`, causing the save button to always
 * appear enabled because the form field is named `schedule`, not `availability`.
 */

function computeFormHasChanges(
  currentSchedule: unknown,
  watchedValues: unknown,
  initialValues: AvailabilityFormValues | null
): boolean {
  if (!initialValues) return false;
  try {
    return (
      JSON.stringify(currentSchedule) !== JSON.stringify(initialValues.schedule) ||
      JSON.stringify(watchedValues) !== JSON.stringify(initialValues)
    );
  } catch {
    return false;
  }
}

const makeFormValues = (overrides?: Partial<AvailabilityFormValues>): AvailabilityFormValues => ({
  name: "Work Schedule",
  timeZone: "America/New_York",
  isDefault: true,
  availability: [],
  dateOverrides: [],
  schedule: [
    [
      { start: new Date("2026-01-01T09:00:00Z"), end: new Date("2026-01-01T17:00:00Z") },
      { start: new Date("2026-01-01T09:00:00Z"), end: new Date("2026-01-01T17:00:00Z") },
    ],
  ],
  ...overrides,
});

describe("AvailabilitySettings formHasChanges logic", () => {
  it("should return false when initial values are null", () => {
    const result = computeFormHasChanges([], {}, null);
    expect(result).toBe(false);
  });

  it("should return false when form values match initial values", () => {
    const initial = makeFormValues();
    const result = computeFormHasChanges(initial.schedule, initial, initial);
    expect(result).toBe(false);
  });

  it("should return true when schedule field has changed", () => {
    const initial = makeFormValues();
    const modifiedSchedule = [
      [{ start: new Date("2026-01-01T10:00:00Z"), end: new Date("2026-01-01T18:00:00Z") }],
    ];
    const result = computeFormHasChanges(modifiedSchedule, initial, initial);
    expect(result).toBe(true);
  });

  it("should return true when name has changed", () => {
    const initial = makeFormValues();
    const watched = { ...initial, name: "New Schedule Name" };
    const result = computeFormHasChanges(initial.schedule, watched, initial);
    expect(result).toBe(true);
  });

  it("should return false after save resets initial values to match current form", () => {
    const initial = makeFormValues();
    const edited = { ...initial, name: "Edited" };
    const afterSave = { ...edited };
    const result = computeFormHasChanges(edited.schedule, edited, afterSave);
    expect(result).toBe(false);
  });

  it("should detect timezone changes", () => {
    const initial = makeFormValues();
    const watched = { ...initial, timeZone: "Europe/London" };
    const result = computeFormHasChanges(initial.schedule, watched, initial);
    expect(result).toBe(true);
  });

  it("should use .schedule property not .availability for comparison", () => {
    const initial = makeFormValues();
    expect(initial.schedule).toBeDefined();
    const result = computeFormHasChanges(initial.schedule, initial, initial);
    expect(result).toBe(false);
  });
});
