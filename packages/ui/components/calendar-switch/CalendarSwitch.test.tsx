import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalendarSwitchComponent } from "./CalendarSwitch";

describe("CalendarSwitchComponent", () => {
  const defaultProps = {
    title: "Work Calendar",
    externalId: "cal-123",
    type: "google_calendar",
    isChecked: true,
    name: "Work Calendar",
    credentialId: 1,
    delegationCredentialId: null,
    eventTypeId: null,
    isLoading: false,
    children: <input type="checkbox" readOnly checked />,
  };

  it("renders the calendar name", () => {
    render(<CalendarSwitchComponent {...defaultProps} />);
    expect(screen.getByText("Work Calendar")).toBeInTheDocument();
  });

  it("renders children (switch element)", () => {
    render(<CalendarSwitchComponent {...defaultProps} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
  });

  it("renders loading spinner when isLoading is true", () => {
    const { container } = render(<CalendarSwitchComponent {...defaultProps} isLoading />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("does not render spinner when not loading", () => {
    const { container } = render(<CalendarSwitchComponent {...defaultProps} isLoading={false} />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).not.toBeInTheDocument();
  });

  it("renders destination indicator when destination is true", () => {
    render(<CalendarSwitchComponent {...defaultProps} destination />);
    expect(screen.getByText("Adding events to")).toBeInTheDocument();
  });

  it("does not render destination indicator by default", () => {
    render(<CalendarSwitchComponent {...defaultProps} />);
    expect(screen.queryByText("Adding events to")).not.toBeInTheDocument();
  });

  it("renders custom translation text", () => {
    render(
      <CalendarSwitchComponent {...defaultProps} destination translations={{ spanText: "Pushing to" }} />
    );
    expect(screen.getByText("Pushing to")).toBeInTheDocument();
  });

  it("uses externalId as label htmlFor", () => {
    const { container } = render(<CalendarSwitchComponent {...defaultProps} />);
    const label = container.querySelector("label");
    expect(label).toHaveAttribute("for", "cal-123");
  });
});
