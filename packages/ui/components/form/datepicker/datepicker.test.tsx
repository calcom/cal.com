import { render, fireEvent } from "@testing-library/react";
import { format } from "date-fns";
import { vi } from "vitest";

import DatePicker from "./DatePicker";

const onChangeMock = vi.fn();

describe("Tests for DatePicker Component", () => {
  const testDate = new Date("2024-02-20");

  beforeEach(() => {
    onChangeMock.mockClear();
  });

  test("Should render correctly with default date", () => {
    const testDate = new Date("2024-02-20");
    const { getByTestId } = render(<DatePicker date={testDate} />);

    const dateButton = getByTestId("pick-date");
    expect(dateButton).toHaveTextContent(format(testDate, "LLL dd, y"));
  });

  test("Should show placeholder when no date is provided", () => {
    const { getByTestId } = render(<DatePicker date={null as unknown as Date} />);

    const dateButton = getByTestId("pick-date");
    expect(dateButton).toHaveTextContent("Pick a date");
  });

  test("Should handle date selection correctly", async () => {
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 5);
    const { getByTestId, getAllByRole } = render(<DatePicker date={testDate} onDatesChange={onChangeMock} />);

    const dateButton = getByTestId("pick-date");
    fireEvent.click(dateButton);
    const gridCells = getAllByRole("gridcell");
    const selectedDate = gridCells.find((cell) => !cell.classList.contains("opacity-50") && !cell.hasAttribute("disabled"));

    expect(selectedDate).toBeTruthy();
    await expect(selectedDate).not.toHaveClass("opacity-50");
  });
  test("Should respect minDate prop", async () => {
    const testDate = new Date("2024-02-20");
    const minDate = new Date("2024-02-19");
    const { getByTestId, getAllByRole } = render(
      <DatePicker date={testDate} minDate={minDate} onDatesChange={onChangeMock} />
    );

    const dateButton = getByTestId("pick-date");
    fireEvent.click(dateButton);

    const disabledDates = getAllByRole("gridcell").filter((cell) => cell.classList.contains("opacity-50"));
    expect(disabledDates.length).toBeGreaterThan(0);
    await expect(disabledDates[0]).toHaveAttribute("disabled");
  });

  test("Should respect disabled prop", () => {
    const { getByTestId } = render(<DatePicker date={testDate} disabled={true} />);

    const dateButton = getByTestId("pick-date");
    expect(dateButton.classList.toString()).toContain("disabled:cursor-not-allowed");
    expect(dateButton.classList.toString()).toContain("disabled:opacity-30");
  });

  test("Should allow cycling years forward and backward", () => {
    const { getByTestId } = render(<DatePicker date={new Date("2024-02-20")} minDate={null} />);

    fireEvent.click(getByTestId("pick-date"));
    expect(getByTestId("datepicker-current-year")).toHaveTextContent("2024");

    fireEvent.click(getByTestId("datepicker-next-year"));
    expect(getByTestId("datepicker-current-year")).toHaveTextContent("2025");

    fireEvent.click(getByTestId("datepicker-prev-year"));
    expect(getByTestId("datepicker-current-year")).toHaveTextContent("2024");
  });

  test("Should disable year navigation when crossing min/max bounds", () => {
    const boundedDate = new Date("2024-02-20");
    const { getByTestId } = render(
      <DatePicker
        date={boundedDate}
        minDate={new Date("2024-01-01")}
        maxDate={new Date("2024-12-31")}
      />
    );

    fireEvent.click(getByTestId("pick-date"));
    expect(getByTestId("datepicker-prev-year")).toBeDisabled();
    expect(getByTestId("datepicker-next-year")).toBeDisabled();
  });

  test("Should update selected date when cycling month", () => {
    const { getByTestId } = render(
      <DatePicker date={new Date("2024-01-31")} minDate={null} onDatesChange={onChangeMock} />
    );

    fireEvent.click(getByTestId("pick-date"));
    fireEvent.click(getByTestId("datepicker-next-month"));

    expect(onChangeMock).toHaveBeenCalled();
    const updatedDate = onChangeMock.mock.lastCall?.[0] as Date;
    expect(format(updatedDate, "yyyy-MM-dd")).toBe("2024-02-29");
  });

  test("Should update selected date when cycling year", () => {
    const { getByTestId } = render(
      <DatePicker date={new Date("2024-02-29")} minDate={null} onDatesChange={onChangeMock} />
    );

    fireEvent.click(getByTestId("pick-date"));
    fireEvent.click(getByTestId("datepicker-next-year"));

    expect(onChangeMock).toHaveBeenCalled();
    const updatedDate = onChangeMock.mock.lastCall?.[0] as Date;
    expect(format(updatedDate, "yyyy-MM-dd")).toBe("2025-02-28");
  });
});
