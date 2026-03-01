import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SegmentedControl from "./SegmentedControl";

const defaultData = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

describe("SegmentedControl", () => {
  it("renders all segment options", () => {
    render(<SegmentedControl data={defaultData} value="day" onChange={vi.fn()} />);
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("Week")).toBeInTheDocument();
    expect(screen.getByText("Month")).toBeInTheDocument();
  });

  it("marks the active value as checked", () => {
    render(<SegmentedControl data={defaultData} value="week" onChange={vi.fn()} />);
    const weekRadio = screen.getByLabelText("Week");
    expect(weekRadio).toBeChecked();
  });

  it("calls onChange when a segment is clicked", () => {
    const handleChange = vi.fn();
    render(<SegmentedControl data={defaultData} value="day" onChange={handleChange} />);
    fireEvent.click(screen.getByText("Month"));
    expect(handleChange).toHaveBeenCalledWith("month");
  });

  it("renders in disabled state", () => {
    render(<SegmentedControl data={defaultData} value="day" onChange={vi.fn()} disabled />);
    const radios = screen.getAllByRole("radio");
    radios.forEach((radio) => {
      expect(radio).toBeDisabled();
    });
  });

  it("applies custom className", () => {
    const { container } = render(
      <SegmentedControl data={defaultData} value="day" onChange={vi.fn()} className="my-segment" />
    );
    expect(container.querySelector(".my-segment")).toBeInTheDocument();
  });

  it("applies data-testid", () => {
    render(<SegmentedControl data={defaultData} value="day" onChange={vi.fn()} data-testid="seg-control" />);
    expect(screen.getByTestId("seg-control")).toBeInTheDocument();
  });

  it("renders with two items", () => {
    const twoItems = [
      { label: "On", value: "on" },
      { label: "Off", value: "off" },
    ];
    render(<SegmentedControl data={twoItems} value="on" onChange={vi.fn()} />);
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("does not call onChange when disabled", () => {
    const handleChange = vi.fn();
    render(<SegmentedControl data={defaultData} value="day" onChange={handleChange} disabled />);
    fireEvent.click(screen.getByText("Month"));
    expect(handleChange).not.toHaveBeenCalled();
  });
});
