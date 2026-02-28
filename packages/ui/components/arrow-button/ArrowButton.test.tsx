import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArrowButton } from "./ArrowButton";

describe("ArrowButton", () => {
  it("renders an up arrow button", () => {
    const { container } = render(<ArrowButton arrowDirection="up" onClick={vi.fn()} />);
    const button = container.querySelector("button");
    expect(button).toBeInTheDocument();
  });

  it("renders a down arrow button", () => {
    const { container } = render(<ArrowButton arrowDirection="down" onClick={vi.fn()} />);
    const button = container.querySelector("button");
    expect(button).toBeInTheDocument();
  });

  it("calls onClick when up button is clicked", () => {
    const handleClick = vi.fn();
    const { container } = render(<ArrowButton arrowDirection="up" onClick={handleClick} />);
    const button = container.querySelector("button")!;
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick when down button is clicked", () => {
    const handleClick = vi.fn();
    const { container } = render(<ArrowButton arrowDirection="down" onClick={handleClick} />);
    const button = container.querySelector("button")!;
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders SVG icon inside button", () => {
    const { container } = render(<ArrowButton arrowDirection="up" onClick={vi.fn()} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
