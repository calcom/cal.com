import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("renders an image with alt text", () => {
    render(<Logo />);
    const img = screen.getByAltText("Cal");
    expect(img).toBeInTheDocument();
  });

  it("uses default src /api/logo", () => {
    render(<Logo />);
    const img = screen.getByAltText("Cal");
    expect(img).toHaveAttribute("src", "/api/logo");
  });

  it("renders icon variant with type=icon query param", () => {
    render(<Logo icon />);
    const img = screen.getByAltText("Cal");
    expect(img).toHaveAttribute("src", "/api/logo?type=icon");
  });

  it("applies small class", () => {
    render(<Logo small />);
    const img = screen.getByAltText("Cal");
    expect(img.className).toContain("h-4");
  });

  it("applies default size when not small", () => {
    render(<Logo />);
    const img = screen.getByAltText("Cal");
    expect(img.className).toContain("h-5");
  });

  it("applies custom className", () => {
    const { container } = render(<Logo className="my-logo" />);
    const h3 = container.querySelector("h3");
    expect(h3?.className).toContain("my-logo");
  });

  it("applies inline class by default", () => {
    const { container } = render(<Logo />);
    const h3 = container.querySelector("h3");
    expect(h3?.className).toContain("inline");
  });

  it("uses custom src when provided", () => {
    render(<Logo src="/custom-logo.png" />);
    const img = screen.getByAltText("Cal");
    expect(img).toHaveAttribute("src", "/custom-logo.png");
  });
});
