import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FilterOption } from "./index";
import { FilterSelect } from "./index";

const options: FilterOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" },
];

describe("FilterSelect", () => {
  it("renders the title on the button", () => {
    render(<FilterSelect title="Status" options={options} onChange={vi.fn()} />);
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders with testId on button", () => {
    render(<FilterSelect title="Status" options={options} onChange={vi.fn()} testId="status-filter" />);
    expect(screen.getByTestId("status-filter-button")).toBeInTheDocument();
  });

  it("shows selected value badge when selectedValue is set", () => {
    render(<FilterSelect title="Status" options={options} selectedValue="active" onChange={vi.fn()} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("does not show badge when no value selected", () => {
    render(<FilterSelect title="Status" options={options} onChange={vi.fn()} />);
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("renders a button element", () => {
    const { container } = render(<FilterSelect title="Status" options={options} onChange={vi.fn()} />);
    const button = container.querySelector("button");
    expect(button).toBeInTheDocument();
  });
});
