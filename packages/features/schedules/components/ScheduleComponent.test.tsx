import type { TimeRange } from "@calcom/types/schedule";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { ScheduleDay } from "./ScheduleComponent";

const DEFAULT_DAY_RANGE: TimeRange = {
  start: new Date(new Date().setUTCHours(9, 0, 0, 0)),
  end: new Date(new Date().setUTCHours(17, 0, 0, 0)),
};

type FormValues = {
  schedule: TimeRange[][];
};

const ScheduleDayWrapper = ({
  initialSchedule,
  onDirtyChange,
}: {
  initialSchedule: TimeRange[][];
  onDirtyChange?: (isDirty: boolean) => void;
}) => {
  const form = useForm<FormValues>({
    defaultValues: {
      schedule: initialSchedule,
    },
  });

  const isDirty = form.formState.isDirty;

  React.useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  return (
    <TooltipProvider>
      <FormProvider {...form}>
        <ScheduleDay
          name="schedule.0"
          weekday="Monday"
          control={form.control}
          CopyButton={<div />}
          userTimeFormat={24}
        />
        <div data-testid="dirty-state">{isDirty ? "dirty" : "clean"}</div>
      </FormProvider>
    </TooltipProvider>
  );
};

describe("ScheduleDay", () => {
  it("should mark form as dirty when toggling a day off", () => {
    render(<ScheduleDayWrapper initialSchedule={[[DEFAULT_DAY_RANGE]]} />);

    expect(screen.getByTestId("dirty-state")).toHaveTextContent("clean");

    const toggle = screen.getByTestId("Monday-switch");
    fireEvent.click(toggle);

    expect(screen.getByTestId("dirty-state")).toHaveTextContent("dirty");
  });

  it("should mark form as dirty when toggling a day on", () => {
    render(<ScheduleDayWrapper initialSchedule={[[]]} />);

    expect(screen.getByTestId("dirty-state")).toHaveTextContent("clean");

    const toggle = screen.getByTestId("Monday-switch");
    fireEvent.click(toggle);

    expect(screen.getByTestId("dirty-state")).toHaveTextContent("dirty");
  });

  it("should be clean again when toggling off then on restores original value", () => {
    render(<ScheduleDayWrapper initialSchedule={[[DEFAULT_DAY_RANGE]]} />);

    expect(screen.getByTestId("dirty-state")).toHaveTextContent("clean");

    const toggle = screen.getByTestId("Monday-switch");

    // Toggle off — form becomes dirty
    fireEvent.click(toggle);
    expect(screen.getByTestId("dirty-state")).toHaveTextContent("dirty");

    // Toggle back on restores the previous value which matches the default,
    // so react-hook-form correctly marks the form as clean
    fireEvent.click(toggle);
    expect(screen.getByTestId("dirty-state")).toHaveTextContent("clean");
  });
});
