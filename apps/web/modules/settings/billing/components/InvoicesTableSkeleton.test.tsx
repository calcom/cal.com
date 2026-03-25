import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InvoicesTableSkeleton } from "./InvoicesTableSkeleton";

describe("InvoicesTableSkeleton", () => {
  it("should render without crashing", () => {
    const { container } = render(<InvoicesTableSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("should render the invoices title", () => {
    render(<InvoicesTableSkeleton />);
    expect(screen.getByText("invoices")).toBeInTheDocument();
  });

  it("should render multiple skeleton elements", () => {
    const { container } = render(<InvoicesTableSkeleton />);
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(10);
  });
});
