import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Divider, VerticalDivider } from "./Divider";

describe("Divider", () => {
  it("renders an hr element", () => {
    const { container } = render(<Divider />);
    const hr = container.querySelector("hr");
    expect(hr).toBeInTheDocument();
  });

  it("applies default classes", () => {
    const { container } = render(<Divider />);
    const hr = container.querySelector("hr");
    expect(hr?.className).toContain("border-subtle");
  });

  it("applies custom className", () => {
    const { container } = render(<Divider className="my-divider" />);
    const hr = container.querySelector("hr");
    expect(hr?.className).toContain("my-divider");
  });
});

describe("VerticalDivider", () => {
  it("renders an svg element", () => {
    const { container } = render(<VerticalDivider />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("has correct dimensions", () => {
    const { container } = render(<VerticalDivider />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "2");
    expect(svg).toHaveAttribute("height", "16");
  });

  it("applies custom className", () => {
    const { container } = render(<VerticalDivider className="my-vertical" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("my-vertical");
  });
});
