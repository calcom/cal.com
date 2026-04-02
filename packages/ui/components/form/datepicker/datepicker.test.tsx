import { fireEvent, render } from "@testing-library/react";
import { format } from "date-fns";
import { vi } from "vitest";
import DatePicker from "./DatePicker";

const onChangeMock = vi.fn();

describe("Tests for DatePicker Component", () => {
  const testDate = new Date("2024-02-20");

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
    const testDate = new Date("2024-02-20");
    const { getByTestId, getAllByRole } = render(<DatePicker date={testDate} onDatesChange={onChangeMock} />);

    const dateButton = getByTestId("pick-date");
    fireEvent.click(dateButton);
    const gridCells = getAllByRole("gridcell");
    const selectedDate = gridCells.find((cell) => {
      return cell.getAttribute("tabindex") === "0";
    });

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
});
