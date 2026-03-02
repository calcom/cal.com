import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { CellWithOverflowX } from "./CellWithOverflowX";

describe("CellWithOverflowX", () => {
  it("should render children", () => {
    render(<CellWithOverflowX>Test Content</CellWithOverflowX>);
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<CellWithOverflowX className="w-[300px]">Content</CellWithOverflowX>);
    expect(container.firstChild).toHaveClass("w-[300px]");
  });

  it("should have overflow container", () => {
    const { container } = render(<CellWithOverflowX>Content</CellWithOverflowX>);
    const scrollContainer = container.querySelector(".overflow-x-auto");
    expect(scrollContainer).toBeInTheDocument();
  });
});
