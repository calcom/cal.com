import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditableHeading } from "./EditableHeading";

describe("EditableHeading", () => {
  const defaultProps = {
    value: "My Event Type",
    onChange: vi.fn(),
    onBlur: vi.fn(),
    name: "title",
  };

  it("renders the value text", () => {
    render(<EditableHeading {...defaultProps} />);
    expect(screen.getByDisplayValue("My Event Type")).toBeInTheDocument();
  });

  it("renders an input element", () => {
    render(<EditableHeading {...defaultProps} />);
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });

  it("calls onChange when input value changes", () => {
    const handleChange = vi.fn();
    render(<EditableHeading {...defaultProps} onChange={handleChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New Title" } });
    expect(handleChange).toHaveBeenCalledWith("New Title");
  });

  it("shows pencil icon when ready and not disabled", () => {
    const { container } = render(<EditableHeading {...defaultProps} isReady />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("hides pencil icon when disabled", () => {
    const { container } = render(<EditableHeading {...defaultProps} isReady disabled />);
    const svgInLabel = container.querySelector("label svg");
    expect(svgInLabel).not.toBeInTheDocument();
  });

  it("disables input when disabled prop is true", () => {
    render(<EditableHeading {...defaultProps} disabled />);
    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });

  it("input is required", () => {
    render(<EditableHeading {...defaultProps} />);
    const input = screen.getByRole("textbox");
    expect(input).toBeRequired();
  });
});
