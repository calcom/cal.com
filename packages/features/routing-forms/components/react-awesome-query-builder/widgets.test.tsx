import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import widgets from "./widgets";

const { SelectWidget, MultiSelectWidget } = widgets;

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
