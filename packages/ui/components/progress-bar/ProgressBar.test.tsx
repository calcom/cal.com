import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("renders the progress bar", () => {
    const { container } = render(<ProgressBar percentageValue={50} />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("applies correct width style based on percentage", () => {
    const { container } = render(<ProgressBar percentageValue={75} />);
    const bar = container.querySelector("[style]");
    expect(bar?.getAttribute("style")).toContain("width: 75%");
  });

  it("clamps percentage to 100", () => {
    const { container } = render(<ProgressBar percentageValue={150} />);
    const bar = container.querySelector("[style]");
    expect(bar?.getAttribute("style")).toContain("width: 100%");
  });

  it("clamps percentage to 0", () => {
    const { container } = render(<ProgressBar percentageValue={-20} />);
    const bar = container.querySelector("[style]");
    expect(bar?.getAttribute("style")).toContain("width: 0%");
  });

  it("renders label when provided", () => {
    render(<ProgressBar percentageValue={50} label="50%" />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("does not render label when not provided", () => {
    const { container } = render(<ProgressBar percentageValue={50} />);
    const span = container.querySelector("span");
    expect(span).not.toBeInTheDocument();
  });

  it("applies green color variant", () => {
    const { container } = render(<ProgressBar percentageValue={50} color="green" />);
    const bar = container.querySelector("[style]");
    expect(bar?.className).toContain("bg-green-500");
  });

  it("applies custom className", () => {
    const { container } = render(<ProgressBar percentageValue={50} className="my-progress" />);
    expect(container.querySelector(".my-progress")).toBeInTheDocument();
  });

  it("uses gray as default color", () => {
    const { container } = render(<ProgressBar percentageValue={50} />);
    const bar = container.querySelector("[style]");
    expect(bar?.className).toContain("bg-gray-500");
  });
});
