import type { TimeRange } from "@calcom/types/schedule";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { ScheduleDay } from "./ScheduleComponent";

const DEFAULT_DAY_RANGE: TimeRange = {
  start: new Date(new Date().setUTCHours(9, 0, 0, 0)),
  end: new Date(new Date().setUTCHours(17, 0, 0, 0)),
};

type FormValues = {
  name: string;
  schedule: TimeRange[][];
  timeZone: string;
};

/**
 * Mirrors the real AvailabilitySettings structure:
 * - useForm with defaultValues matching the real form shape
 * - useWatch on all form values (same as AvailabilitySettings)
 * - isDirty from form.formState (same as AvailabilitySettings)
 * - Save button disabled when !isDirty (same as AvailabilitySettings)
 */
const AvailabilitySettingsWrapper = ({ initialSchedule }: { initialSchedule: TimeRange[][] }) => {
  const form = useForm<FormValues>({
    defaultValues: {
      name: "Working Hours",
      schedule: initialSchedule,
      timeZone: "UTC",
    },
  });

  // Mirrors AvailabilitySettings: useWatch on all values
  const watchedValues = useWatch({ control: form.control });
  void watchedValues;

  const { isDirty } = form.formState;

  return (
    <TooltipProvider>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(() => {})}>
          {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
            <ScheduleDay
              key={dayIndex}
              name={`schedule.${dayIndex}` as "schedule.0"}
              weekday={
                ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayIndex]
              }
              control={form.control}
              CopyButton={<div />}
              userTimeFormat={24}
            />
          ))}
          <button type="submit" data-testid="save-button" disabled={!isDirty}>
            Save
          </button>
          <div data-testid="dirty-state">{isDirty ? "dirty" : "clean"}</div>
        </form>
      </FormProvider>
    </TooltipProvider>
  );
};

const FULL_WEEK_SCHEDULE: TimeRange[][] = [
  [], // Sunday - off
  [DEFAULT_DAY_RANGE], // Monday
  [DEFAULT_DAY_RANGE], // Tuesday
  [DEFAULT_DAY_RANGE], // Wednesday
  [DEFAULT_DAY_RANGE], // Thursday
  [DEFAULT_DAY_RANGE], // Friday
  [], // Saturday - off
];

describe("ScheduleDay", () => {
  it("should mark form as dirty when toggling a day off", () => {
    render(<AvailabilitySettingsWrapper initialSchedule={FULL_WEEK_SCHEDULE} />);

    expect(screen.getByTestId("dirty-state")).toHaveTextContent("clean");
    expect(screen.getByTestId("save-button")).toBeDisabled();

    const toggle = screen.getByTestId("Monday-switch");
    fireEvent.click(toggle);

    expect(screen.getByTestId("dirty-state")).toHaveTextContent("dirty");
    expect(screen.getByTestId("save-button")).toBeEnabled();
  });

  it("should mark form as dirty when toggling a day on", () => {
    render(<AvailabilitySettingsWrapper initialSchedule={FULL_WEEK_SCHEDULE} />);

    expect(screen.getByTestId("dirty-state")).toHaveTextContent("clean");

    // Sunday is off by default, toggle it on
    const toggle = screen.getByTestId("Sunday-switch");
    fireEvent.click(toggle);

    expect(screen.getByTestId("dirty-state")).toHaveTextContent("dirty");
    expect(screen.getByTestId("save-button")).toBeEnabled();
  });

  it("should be clean again when toggling off then on restores original value", () => {
    render(<AvailabilitySettingsWrapper initialSchedule={FULL_WEEK_SCHEDULE} />);

    expect(screen.getByTestId("dirty-state")).toHaveTextContent("clean");

    const toggle = screen.getByTestId("Monday-switch");

    // Toggle off - form becomes dirty
    fireEvent.click(toggle);
    expect(screen.getByTestId("dirty-state")).toHaveTextContent("dirty");

    // Toggle back on restores the previous value which matches the default
    fireEvent.click(toggle);
    expect(screen.getByTestId("dirty-state")).toHaveTextContent("clean");
  });

  it("should keep form dirty after toggling multiple days", () => {
    render(<AvailabilitySettingsWrapper initialSchedule={FULL_WEEK_SCHEDULE} />);

    expect(screen.getByTestId("dirty-state")).toHaveTextContent("clean");

    // Toggle Monday off
    fireEvent.click(screen.getByTestId("Monday-switch"));
    expect(screen.getByTestId("dirty-state")).toHaveTextContent("dirty");

    // Toggle Tuesday off
    fireEvent.click(screen.getByTestId("Tuesday-switch"));
    expect(screen.getByTestId("dirty-state")).toHaveTextContent("dirty");

    // Restore Monday - still dirty because Tuesday is still off
    fireEvent.click(screen.getByTestId("Monday-switch"));
    expect(screen.getByTestId("dirty-state")).toHaveTextContent("dirty");

    // Restore Tuesday - all back to default, should be clean
    fireEvent.click(screen.getByTestId("Tuesday-switch"));
    expect(screen.getByTestId("dirty-state")).toHaveTextContent("clean");
  });
});
