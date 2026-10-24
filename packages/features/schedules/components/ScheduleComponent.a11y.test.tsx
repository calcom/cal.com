import type { TimeRange } from "@calcom/types/schedule";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { DayRanges, ScheduleComponent } from "./ScheduleComponent";

const mockMessages: Record<string, string> = {
  start_time_of_day: "{{day}} start time",
  end_time_of_day: "{{day}} end time",
  add_time_slot_of_day: "Add time slot for {{day}}",
  copy_times_of_day_to: "Copy {{day}}'s times to…",
  remove_time_slot_of_day: "Remove time slot for {{day}}",
  add_time_availability: "Add new time slot",
  copy_times_to_tooltip: "Copy times to …",
  start_time: "Start time",
  end_time: "End time",
  delete: "Delete",
};

// The schedule UI reads its accessible names from the locale, so keep the test independent of i18n setup.
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string, options?: { day?: string }) =>
      (mockMessages[key] ?? key).replace("{{day}}", options?.day ?? ""),
    i18n: { language: "en" },
    isLocaleReady: true,
  }),
}));

const mondayRange: TimeRange[] = [
  {
    start: new Date("2024-01-15T09:00:00Z"),
    end: new Date("2024-01-15T17:00:00Z"),
  },
  {
    start: new Date("2024-01-15T18:00:00Z"),
    end: new Date("2024-01-15T20:00:00Z"),
  },
];

type FormValues = { schedule: TimeRange[][] };

const TestForm = () => {
  const form = useForm<FormValues>({
    defaultValues: {
      // weekStart=0 means Monday is at index 1.
      schedule: [[], mondayRange, [], [], [], [], []],
    },
  });

  return (
    <TooltipProvider>
      <FormProvider {...form}>
        <ScheduleComponent<FormValues, "schedule">
          name="schedule"
          control={form.control}
          userTimeFormat={12}
        />
      </FormProvider>
    </TooltipProvider>
  );
};

const TestDayRanges = () => {
  const form = useForm<FormValues>({
    defaultValues: {
      schedule: [[], mondayRange, [], [], [], [], []],
    },
  });

  return (
    <TooltipProvider>
      <FormProvider {...form}>
        <DayRanges<FormValues> name="schedule.1" userTimeFormat={12} />
      </FormProvider>
    </TooltipProvider>
  );
};

describe("ScheduleComponent accessible names", () => {
  it("labels each day's time pickers with the day name", () => {
    render(<TestForm />);

    expect(screen.getAllByRole("combobox", { name: "Monday start time" })).toHaveLength(2);
    expect(screen.getAllByRole("combobox", { name: "Monday end time" })).toHaveLength(2);
  });

  it("labels the icon buttons next to the time pickers", () => {
    render(<TestForm />);

    expect(screen.getByRole("button", { name: "Add time slot for Monday" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Monday's times to…" })).toBeInTheDocument();
  });

  it("labels every remove button for the day", () => {
    render(<TestForm />);

    expect(screen.getAllByRole("button", { name: "Remove time slot for Monday" })).toHaveLength(2);
  });

  it("falls back to day-agnostic names when no weekday is provided (date overrides)", () => {
    render(<TestDayRanges />);

    expect(screen.getAllByRole("combobox", { name: "Start time" })).toHaveLength(2);
    expect(screen.getAllByRole("combobox", { name: "End time" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Add new time slot" })).toBeInTheDocument();
  });
});
