import { vi } from "vitest";

vi.mock("../LargeCalendar", () => ({
  LargeCalendar: ({ extraDays, schedule }: { extraDays: number; schedule: any }) => {
    return (
      <div>
        <h2>Test Large Calendar</h2>
        <p>Extra Days: {extraDays}</p>
        <p>Schedule: {JSON.stringify(schedule)}</p>
      </div>
    );
  },
}));
