import { render, screen, fireEvent } from "@testing-library/react";
import { format } from "date-fns";
import { vi } from "vitest";

import widgets from "./widgets";

const { SelectWidget, MultiSelectWidget, DateWidget } = widgets;

// Mock the dynamic import of Select component
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    return function MockSelect({
      options,
      onChange,
      value,
      isMulti,
    }: {
      options: { value: string; label: string }[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange: (value: any) => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: any;
      isMulti: boolean;
    }) {
      return (
        <select
          data-testid="mock-select"
          multiple={isMulti}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          value={isMulti ? value.map((v: any) => v.value) : value?.value}
          onChange={(e) => {
            const selectedOptions = Array.from(e.target.selectedOptions, (option) => ({
              value: option.value,
              label: option.text,
            }));
            onChange(isMulti ? selectedOptions : selectedOptions[0]);
          }}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    };
  },
}));

describe("Select Widgets", () => {
  describe("SelectWidget", () => {
    const listValues = [
      { title: "Option 1", value: "1" },
      { title: "Option 2", value: "2" },
      { title: "Option 3", value: "3" },
    ];

    it("should handle render the value in option correctly", () => {
      const setValue = vi.fn();
      render(<SelectWidget value="2" setValue={setValue} listValues={listValues} />);

      const select = screen.getByTestId("mock-select");
      expect(select).toBeInTheDocument();
      expect(screen.getAllByRole("option")).toHaveLength(3);
      expect(setValue).not.toHaveBeenCalled();
    });

    it("should handle a value that is not in the list and reset the value to empty string", () => {
      const setValue = vi.fn();
      render(<SelectWidget value="4" setValue={setValue} listValues={listValues} />);

      const select = screen.getByTestId("mock-select");
      expect(select).toBeInTheDocument();
      expect(screen.getAllByRole("option")).toHaveLength(3);
      expect(setValue).toHaveBeenCalledWith("");
    });
  });

  describe("MultiSelectWidget", () => {
    const listValues = [
      { title: "Option 1", value: "1" },
      { title: "Option 2", value: "2" },
      { title: "Option 3", value: "3" },
    ];

    it("renders options correctly", () => {
      const setValue = vi.fn();

      render(<MultiSelectWidget value={[]} setValue={setValue} listValues={listValues} />);

      const select = screen.getByTestId("mock-select");
      expect(select).toBeInTheDocument();
      expect(screen.getAllByRole("option")).toHaveLength(3);
      expect(setValue).not.toHaveBeenCalled();
    });

    it("sets value to empty array when no options match", () => {
      const setValue = vi.fn();
      render(<MultiSelectWidget value={["4", "5"]} setValue={setValue} listValues={listValues} />);

      expect(setValue).toHaveBeenCalledWith([]);
    });
  });
});

// Mock the DatePicker component
vi.mock("@calcom/ui/components/form", () => ({
  __esModule: true,
  DatePicker: ({ date, onDatesChange }: { date: Date; onDatesChange?: (date: Date) => void }) => {
    // Simulate a user selecting a new date for testing
    const newDate = new Date(2025, 9, 23); // Oct 23, 2025
    return (
      <button data-testid="mock-date-picker" onClick={() => onDatesChange?.(newDate)}>
        {date ? format(date, "LLL dd, y") : "Pick a date"}
      </button>
    );
  },
}));

describe("DateWidget", () => {
  it("renders with initial value correctly", () => {
    const setValue = vi.fn();
    render(<DateWidget value="2025-10-22" setValue={setValue} />);

    const dateButton = screen.getByTestId("mock-date-picker");
    expect(dateButton).toBeInTheDocument();
    expect(dateButton.textContent).toBe("Oct 22, 2025"); // matches LLL dd, y
    expect(setValue).not.toHaveBeenCalled();
  });

  it("handles empty value correctly", () => {
    const setValue = vi.fn();
    render(<DateWidget value="" setValue={setValue} />);

    const dateButton = screen.getByTestId("mock-date-picker");
    expect(dateButton.textContent).toBe("Pick a date");
  });

  it("calls setValue with correct formatted date when date changes", () => {
    const setValue = vi.fn();
    render(<DateWidget value="2025-10-22" setValue={setValue} />);

    const dateButton = screen.getByTestId("mock-date-picker");

    // Simulate user picking a new date
    fireEvent.click(dateButton);

    // DateWidget formats the picked date as "YYYY-MM-DD" internally
    expect(setValue).toHaveBeenCalledWith("2025-10-23");
  });

  it("parses local date correctly from string", () => {
    const setValue = vi.fn();
    render(<DateWidget value="2025-02-28" setValue={setValue} />);

    const dateButton = screen.getByTestId("mock-date-picker");
    expect(dateButton.textContent).toBe("Feb 28, 2025");
  });


  it("handles invalid date string gracefully", () => {
    const setValue = vi.fn();
    render(<DateWidget value="invalid-date" setValue={setValue} />);

    const dateButton = screen.getByTestId("mock-date-picker");
    expect(dateButton.textContent).toBe("Pick a date");
  });

  it("handles null/undefined value correctly", () => {
    const setValue = vi.fn();

    render(<DateWidget value={null as unknown as string} setValue={setValue} />);

    const dateButton = screen.getByTestId("mock-date-picker");
    expect(dateButton.textContent).toBe("Pick a date");
  });

});
