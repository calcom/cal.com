/* eslint-disable playwright/missing-playwright-await */
import { render, fireEvent } from "@testing-library/react";
import { format } from "date-fns";
import { vi } from "vitest";

import DatePicker from "./DatePicker";

describe("Tests for DatePicker component", () => {
  const date = new Date("2023-07-15");

  test("Should display the selected date correctly and call the onDatesChange callback when the selected date changes", () => {
    const mockOnDatesChange = vi.fn((changedDate: Date) => format(new Date(changedDate), "yyyy-MM-dd"));
    const { container } = render(<DatePicker date={date} onDatesChange={mockOnDatesChange} />);

    const day = container.querySelector('input[name="day"]') as HTMLInputElement;
    const dayEvent = { target: { value: "27" } };

    const month = container.querySelector('input[name="month"]') as HTMLInputElement;
    const monthEvent = { target: { value: "06" } };

    const year = container.querySelector('input[name="year"]') as HTMLInputElement;
    const yearEvent = { target: { value: "2022" } };

    fireEvent.change(day, dayEvent);
    expect(mockOnDatesChange).toHaveReturnedWith("2023-07-27");

    fireEvent.change(month, monthEvent);
    expect(mockOnDatesChange).toHaveReturnedWith("2023-06-27");

    fireEvent.change(year, yearEvent);
    expect(mockOnDatesChange).toHaveReturnedWith("2022-06-27");

    expect(mockOnDatesChange).toHaveBeenCalledTimes(3);
  });

  test("Should disable the DatePicker when disabled prop is true", () => {
    const { getByDisplayValue } = render(<DatePicker date={date} disabled />);

    const dateInput = getByDisplayValue(format(date, "yyyy-MM-dd")) as HTMLInputElement;
    expect(dateInput).toBeDisabled();
  });
});

HTMLCanvasElement.prototype.getContext = vi.fn() as never;
