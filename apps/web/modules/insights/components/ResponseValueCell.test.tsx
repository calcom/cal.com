import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ResponseValueCell } from "./ResponseValueCell";

vi.mock("@calcom/web/components/ui/LimitedBadges", () => ({
  LimitedBadges: ({ items }: { items: Array<{ label: string }> }) => (
    <div data-testid="limited-badges">
      {items.map((item) => (
        <span key={item.label}>{item.label}</span>
      ))}
    </div>
  ),
}));

describe("ResponseValueCell", () => {
  it("should render empty div when values array is empty", () => {
    const { container } = render(<ResponseValueCell optionMap={{}} values={[]} />);
    expect(container.querySelector(".h-6")).toBeInTheDocument();
  });

  it("should map option IDs to labels", () => {
    const optionMap = { opt1: "Option One", opt2: "Option Two" };
    render(<ResponseValueCell optionMap={optionMap} values={["opt1", "opt2"]} />);
    expect(screen.getByText("Option One")).toBeInTheDocument();
    expect(screen.getByText("Option Two")).toBeInTheDocument();
  });

  it("should fall back to raw ID when not in optionMap", () => {
    render(<ResponseValueCell optionMap={{}} values={["unknown-id"]} />);
    expect(screen.getByText("unknown-id")).toBeInTheDocument();
  });
});
