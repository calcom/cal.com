import { render, fireEvent } from "@testing-library/react";
import { format } from "date-fns";
import { beforeEach, vi } from "vitest";

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
    const { getByTestId } = render(<DatePicker date={null} />);

    const dateButton = getByTestId("pick-date");
    expect(dateButton).toHaveTextContent("Pick a date");
  });

  test("Should handle date selection correctly", () => {
    const { getByTestId, getAllByRole } = render(
      <DatePicker date={testDate} onDatesChange={onChangeMock} />,
    );

    const dateButton = getByTestId("pick-date");
    fireEvent.click(dateButton);

    const gridCells = getAllByRole("gridcell");
    const selectedDate = gridCells.find((cell) => {
      return cell.getAttribute("tabindex") === "0";
    });

    expect(selectedDate).toBeTruthy();
    expect(selectedDate).not.toHaveAttribute("aria-disabled", "true");

    fireEvent.click(selectedDate as HTMLElement);
    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith(expect.any(Date));
  });

  test("Should respect minDate prop", () => {
    const minDate = new Date("2024-02-19");
    const { getByTestId, getByRole } = render(
      <DatePicker
        date={testDate}
        minDate={minDate}
        onDatesChange={onChangeMock}
      />,
    );

    const dateButton = getByTestId("pick-date");
    fireEvent.click(dateButton);

    const dayBeforeMinDate = getByRole("gridcell", {
      name: /February 18.*2024/i,
    });
    const minDateCell = getByRole("gridcell", {
      name: /February 19.*2024/i,
    });

    expect(dayBeforeMinDate).toHaveAttribute("aria-disabled", "true");
    expect(minDateCell).not.toHaveAttribute("aria-disabled", "true");
  });

  test("Should respect disabled prop", () => {
    const { getByTestId, queryByRole } = render(
      <DatePicker date={testDate} disabled={true} />,
    );

    const dateButton = getByTestId("pick-date");
    expect(dateButton).toBeDisabled();

    fireEvent.click(dateButton);
    expect(queryByRole("grid")).not.toBeInTheDocument();
  });
});
