import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon";
import { Spinner } from "./Spinner";

describe("Icon", () => {
  it("renders an SVG element", () => {
    const { container } = render(<Icon name="calendar" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("uses default size of 16", () => {
    const { container } = render(<Icon name="calendar" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "16");
    expect(svg).toHaveAttribute("height", "16");
  });

  it("applies custom size", () => {
    const { container } = render(<Icon name="calendar" size={24} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("height", "24");
  });

  it("applies custom className", () => {
    const { container } = render(<Icon name="calendar" className="custom-icon" />);
    const svg = container.querySelector("svg");
    expect(svg?.className.baseVal).toContain("custom-icon");
  });

  it("renders a use element referencing the sprite", () => {
    const { container } = render(<Icon name="calendar" />);
    const use = container.querySelector("use");
    expect(use).toBeInTheDocument();
  });
});

describe("Spinner", () => {
  it("renders an SVG element", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Spinner className="spin-fast" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("spin-fast");
  });
});
