import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { vi } from "vitest";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PeriodType } from "@calcom/prisma/enums";

import NoAvailabilityDialog from "./NoAvailabilityDialog";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string, vars?: { [key: string]: string | number }) => {
      if (key === "no_availability_in_month") return `No availability in ${vars?.month}`;
      if (key === "no_availability_rolling")
        return `Scheduling is only available up to ${vars?.days} in advance. Please check again soon.`;
      if (key === "no_availability_range")
        return `Scheduling ended on ${vars?.date}. Please check again soon.`;
      if (key === "close") return "Close";
      if (key === "view_next_month") return "View next month";
      if (key === "calendar_days") return "calendar days";
      return key;
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NoAvailabilityOverlay", () => {
  const defaultProps = {
    month: "March",
    nextMonthButton: vi.fn(),
    browsingDate: dayjs(),
    periodData: {
      periodType: PeriodType.UNLIMITED,
      periodDays: null,
      periodCountCalendarDays: false,
      periodStartDate: null,
      periodEndDate: null,
    },
  };

  test("shows rolling period message when period type is ROLLING and period ends before next month", () => {
    const periodDays = 5;
    const { t } = useLocale();

    render(
      <NoAvailabilityDialog
        {...defaultProps}
        browsingDate={dayjs().add(40, "days")}
        periodData={{
          ...defaultProps.periodData,
          periodType: "ROLLING",
          periodDays: periodDays,
          periodCountCalendarDays: true,
        }}
      />
    );
    expect(
      screen.getByText(
        `Scheduling is only available up to ${periodDays} calendar days in advance. Please check again soon.`
      )
    ).toBeInTheDocument();
  });

  test("shows range period message when period type is RANGE and range ends before the next month", () => {
    const startDate = dayjs().subtract(30, "days");
    const endDate = dayjs();
    render(
      <NoAvailabilityDialog
        {...defaultProps}
        browsingDate={dayjs().add(40, "days")}
        periodData={{
          ...defaultProps.periodData,
          periodType: "RANGE",
          periodStartDate: startDate.toDate(),
          periodEndDate: endDate.toDate(),
        }}
      />
    );
    expect(
      screen.getByText(`Scheduling ended on ${endDate.format("MMMM D YYYY")}. Please check again soon.`)
    ).toBeInTheDocument();
  });

  test("calls nextMonthButton when 'View next month' is clicked", () => {
    render(<NoAvailabilityDialog {...defaultProps} />);
    const nextButton = screen.getByText("View next month");
    fireEvent.click(nextButton);
    expect(defaultProps.nextMonthButton).toHaveBeenCalled();
  });

  test("shows 'View next month' and close buttons when browsing current date with rolling 30-day period", () => {
    render(
      <NoAvailabilityDialog
        {...defaultProps}
        browsingDate={dayjs()}
        periodData={{
          ...defaultProps.periodData,
          periodType: "ROLLING",
          periodDays: 30,
          periodCountCalendarDays: true,
        }}
      />
    );
    const nextMonthButton = screen.getAllByTestId("view_next_month");
    const closeButton = screen.getAllByTestId("close_dialog_button");
    expect(nextMonthButton).toHaveLength(1);
    expect(closeButton).toHaveLength(1);
  });

  test("shows 'View next month' and 'close' button when browsing current date with range periodType starting 10 days in past and ending in a future month", () => {
    render(
      <NoAvailabilityDialog
        {...defaultProps}
        browsingDate={dayjs()}
        periodData={{
          ...defaultProps.periodData,
          periodType: "RANGE",
          periodStartDate: dayjs().subtract(10, "days").toDate(),
          periodEndDate: dayjs().add(40, "days").toDate(),
        }}
      />
    );
    const nextMonthButton = screen.getAllByTestId("view_next_month");
    const closeButton = screen.getAllByTestId("close_dialog_button");
    expect(nextMonthButton).toHaveLength(1);
    expect(closeButton).toHaveLength(1);
  });
});
