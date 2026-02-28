import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyScreen } from "./EmptyScreen";

describe("EmptyScreen", () => {
  it("renders headline text", () => {
    render(<EmptyScreen headline="No results found" />);
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<EmptyScreen headline="Empty" description="Try adjusting your filters" />);
    expect(screen.getByText("Try adjusting your filters")).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    const { container } = render(<EmptyScreen headline="Empty" />);
    const descDiv = container.querySelector(".text-default.mb-8");
    expect(descDiv).not.toBeInTheDocument();
  });

  it("renders button when buttonText and buttonOnClick are provided", () => {
    const handleClick = vi.fn();
    render(<EmptyScreen headline="Empty" buttonText="Add New" buttonOnClick={handleClick} />);
    const button = screen.getByText("Add New");
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
  });

  it("renders custom buttonRaw", () => {
    render(<EmptyScreen headline="Empty" buttonRaw={<span>Custom Button</span>} />);
    expect(screen.getByText("Custom Button")).toBeInTheDocument();
  });

  it("renders avatar when provided", () => {
    render(<EmptyScreen headline="Empty" avatar={<img alt="avatar" src="/test.png" />} />);
    expect(screen.getByAltText("avatar")).toBeInTheDocument();
  });

  it("applies border by default", () => {
    render(<EmptyScreen headline="Empty" />);
    const el = screen.getByTestId("empty-screen");
    expect(el.className).toContain("border");
  });

  it("removes border when border=false", () => {
    render(<EmptyScreen headline="Empty" border={false} />);
    const el = screen.getByTestId("empty-screen");
    expect(el.className).not.toContain("border-subtle");
  });

  it("applies dashed border by default", () => {
    render(<EmptyScreen headline="Empty" />);
    const el = screen.getByTestId("empty-screen");
    expect(el.className).toContain("border-dashed");
  });

  it("applies custom className", () => {
    render(<EmptyScreen headline="Empty" className="custom-empty" />);
    const el = screen.getByTestId("empty-screen");
    expect(el.className).toContain("custom-empty");
  });
});
