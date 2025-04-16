import { render } from "@testing-library/react";

import dayjs from "@calcom/dayjs";
import { PeriodType } from "@calcom/prisma/enums";

import { DatePicker } from "../DatePicker";

const noop = () => {
  /* noop */
};

describe("Tests for DatePicker Component", () => {
  test("Should render correctly with default date", async () => {
    const testDate = dayjs("2024-02-20");
    const { getByTestId } = render(
      <DatePicker
        onChange={noop}
        browsingDate={testDate}
        locale="en"
        periodData={{
          periodType: PeriodType.UNLIMITED,
          periodDays: null,
          periodCountCalendarDays: false,
          periodStartDate: null,
          periodEndDate: null,
        }}
      />
    );

    const selectedMonthLabel = getByTestId("selected-month-label");
    await expect(selectedMonthLabel).toHaveAttribute("dateTime", testDate.format("YYYY-MM"));
  });

  test("Should render with the minimum date if browsingDate < minDate", async () => {
    const testDate = dayjs("2024-02-20");
    const minDate = dayjs("2025-02-10");
    const { getByTestId } = render(
      <DatePicker onChange={noop} browsingDate={testDate} minDate={minDate.toDate()} locale="en" />
    );

    const selectedMonthLabel = getByTestId("selected-month-label");
    await expect(selectedMonthLabel).toHaveAttribute("dateTime", minDate.format("YYYY-MM"));
  });

  test("Should render with the browsingDate date if browsingDate >= minDate", async () => {
    const testDate = dayjs("2025-03-20");
    const minDate = dayjs("2025-02-10");
    const { getByTestId } = render(
      <DatePicker onChange={noop} browsingDate={testDate} minDate={minDate} locale="en" />
    );

    const selectedMonthLabel = getByTestId("selected-month-label");
    await expect(selectedMonthLabel).toHaveAttribute("dateTime", testDate.format("YYYY-MM"));
  });
});
