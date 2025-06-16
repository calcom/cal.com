import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import dayjs from "@calcom/dayjs";
import { PeriodType } from "@calcom/prisma/enums";

import NoAvailabilityDialog from "../NoAvailabilityDialog";

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
      periodCountCalendarDays: true,
      periodStartDate: null,
      periodEndDate: null,
    },
  };

  test("Displays rolling period description and close button, when period type is ROLLING, and period ends before next month.", () => {
    const periodDays = 5;

    render(
      <NoAvailabilityDialog
        {...defaultProps}
        browsingDate={dayjs().add(periodDays + 1, "day")}
        periodData={{
          ...defaultProps.periodData,
          periodType: PeriodType.ROLLING,
          periodDays: periodDays,
        }}
      />
    );

    expect(screen.getByRole("dialog")).toHaveTextContent(
      `Scheduling is only available up to ${periodDays} calendar days in advance. Please check again soon.`
    );
    const nextMonthButton = screen.queryAllByTestId("view_next_month");
    const closeButton = screen.getAllByTestId("close_dialog_button");
    expect(nextMonthButton).toHaveLength(0);
    expect(closeButton).toHaveLength(1);
  });

  test("Displays range period description when period type is RANGE and range ends before the next month", () => {
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
    expect(screen.getByRole("dialog")).toHaveTextContent(
      `Scheduling ended on ${endDate.format("MMMM D YYYY")}. Please check again soon.`
    );
    const nextMonthButton = screen.queryAllByTestId("view_next_month");
    const closeButton = screen.getAllByTestId("close_dialog_button");
    expect(nextMonthButton).toHaveLength(0);
    expect(closeButton).toHaveLength(1);
  });

  test("calls nextMonthButton when 'View next month' is clicked", () => {
    render(<NoAvailabilityDialog {...defaultProps} />);
    const nextButton = screen.getByText("View next month");
    fireEvent.click(nextButton);
    expect(defaultProps.nextMonthButton).toHaveBeenCalled();
  });

  test("Displays 'View next month' and close buttons, without description, when browsing current date with rolling 32-day period", () => {
    render(
      <NoAvailabilityDialog
        {...defaultProps}
        browsingDate={dayjs()}
        periodData={{
          ...defaultProps.periodData,
          periodType: "ROLLING",
          // 32 days means that next month would atleast have 1 day available, so future limit violation isn't there and no description is shown
          periodDays: 32,
        }}
      />
    );
    const description = screen.queryByTestId("dialog-subtitle");
    const nextMonthButton = screen.getAllByTestId("view_next_month");
    const closeButton = screen.getAllByTestId("close_dialog_button");
    expect(description).not.toBeInTheDocument();
    expect(nextMonthButton).toHaveLength(1);
    expect(closeButton).toHaveLength(1);
  });

  test("Displays 'View next month' and 'close' button when browsing current date with range periodType starting 10 days in past and ending in a future month", () => {
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
    const description = screen.queryByTestId("dialog-subtitle");
    const nextMonthButton = screen.getAllByTestId("view_next_month");
    const closeButton = screen.getAllByTestId("close_dialog_button");
    expect(description).not.toBeInTheDocument();
    expect(nextMonthButton).toHaveLength(1);
    expect(closeButton).toHaveLength(1);
  });
});
