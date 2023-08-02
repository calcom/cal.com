/* eslint-disable playwright/missing-playwright-await */
import { render, fireEvent } from "@testing-library/react";
import { format } from "date-fns";
import { vi } from "vitest";

import DateRangePicker from "./DateRangePicker";

describe("Tests for DateRangePicker component", () => {
  const startDate = new Date("2023-07-15");
  const endDate = new Date("2023-07-20");

  test("Should display the selected start and end dates", () => {
    const { getByDisplayValue } = render(<DateRangePicker startDate={startDate} endDate={endDate} />);

    const expectedStartDate = format(new Date(startDate), "yyyy-MM-dd");
    const expectedEndDate = format(new Date(endDate), "yyyy-MM-dd");

    expect(getByDisplayValue(expectedStartDate)).toBeInTheDocument();
    expect(getByDisplayValue(expectedEndDate)).toBeInTheDocument();
  });

  test("Should disable the DateRangePicker when disabled prop is true", () => {
    const { getByDisplayValue } = render(
      <DateRangePicker startDate={startDate} endDate={endDate} disabled />
    );

    const startDateInput = getByDisplayValue(format(startDate, "yyyy-MM-dd")) as HTMLInputElement;
    const endDateInput = getByDisplayValue(format(endDate, "yyyy-MM-dd")) as HTMLInputElement;
    expect(startDateInput).toBeDisabled();
    expect(endDateInput).toBeDisabled();
  });

  test("Should call the onDatesChange callback when the selected dates change", () => {
    const startDate = new Date("2023-07-14");
    const endDate = new Date("2023-07-19");

    const mockOnDatesChange = vi.fn();

    const { getByDisplayValue } = render(
      <DateRangePicker startDate={startDate} endDate={endDate} onDatesChange={mockOnDatesChange} />
    );

    const startDateInput = getByDisplayValue(format(startDate, "yyyy-MM-dd")) as HTMLInputElement;
    const endDateInput = getByDisplayValue(format(endDate, "yyyy-MM-dd")) as HTMLInputElement;

    const newStartDate = new Date(startDate);
    newStartDate.setDate(newStartDate.getDate() + 1);

    const newEndDate = new Date(endDate);
    newEndDate.setDate(newEndDate.getDate() + 1);

    const eventStartDate = { target: { value: format(newStartDate, "yyyy-MM-dd") } };
    const eventEndDate = { target: { value: format(newEndDate, "yyyy-MM-dd") } };
    fireEvent.change(startDateInput, eventStartDate);
    fireEvent.change(endDateInput, eventEndDate);

    const formattedStartDate = mockOnDatesChange.mock.calls[0][0].startDate;
    const formattedEndDate = mockOnDatesChange.mock.calls[1][0].endDate;

    expect(mockOnDatesChange).toHaveBeenCalled();

    expect(mockOnDatesChange).toHaveBeenCalledWith({
      startDate: expect.any(Date),
      endDate: expect.any(Date),
    });

    expect(formattedStartDate.getDate()).toEqual(newStartDate.getDate());
    expect(formattedStartDate.getMonth()).toEqual(newStartDate.getMonth());
    expect(formattedStartDate.getFullYear()).toEqual(newStartDate.getFullYear());

    expect(formattedEndDate.getDate()).toEqual(newEndDate.getDate());
    expect(formattedEndDate.getMonth()).toEqual(newEndDate.getMonth());
    expect(formattedEndDate.getFullYear()).toEqual(newEndDate.getFullYear());
  });
});

HTMLCanvasElement.prototype.getContext = vi.fn() as never;
