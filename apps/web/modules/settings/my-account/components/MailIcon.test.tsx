import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MailIcon } from "./MailIcon";

describe("MailIcon", () => {
  it("should render an SVG element", () => {
    const { container } = render(<MailIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should have aria-hidden attribute for accessibility", () => {
    const { container } = render(<MailIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("should have correct dimensions", () => {
    const { container } = render(<MailIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "124");
    expect(svg).toHaveAttribute("height", "110");
  });
});
