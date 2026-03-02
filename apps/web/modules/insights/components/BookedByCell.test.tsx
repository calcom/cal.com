import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { BookedByCell } from "./BookedByCell";

describe("BookedByCell", () => {
  it("should render empty div when no attendees", () => {
    const { container } = render(<BookedByCell attendees={[]} rowId={1} />);
    expect(container.querySelector(".min-w-\\[200px\\]")).toBeInTheDocument();
  });

  it("should render empty div when attendees is null", () => {
    const { container } = render(<BookedByCell attendees={null as never} rowId={1} />);
    expect(container.querySelector(".min-w-\\[200px\\]")).toBeInTheDocument();
  });

  it("should render attendee badges", () => {
    const attendees = [
      { name: "Alice", email: "alice@example.com", phoneNumber: null, timeZone: "UTC" },
      { name: "Bob", email: "bob@example.com", phoneNumber: "+1234567890", timeZone: "America/New_York" },
    ];
    render(
      <TooltipProvider>
        <BookedByCell attendees={attendees} rowId={1} />
      </TooltipProvider>
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});
