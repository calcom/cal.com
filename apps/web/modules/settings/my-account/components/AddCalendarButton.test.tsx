import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/ui/components/button", () => ({
  Button: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href?: string;
    color?: string;
    StartIcon?: string;
  }) => (
    <a href={href} data-testid="button" {...rest}>
      {children}
    </a>
  ),
}));

describe("AddCalendarButton", async () => {
  const AddCalendarButton = (await import("./AddCalendarButton")).default;
  it("should render the button with add_calendar text", () => {
    render(<AddCalendarButton />);
    expect(screen.getByText("add_calendar")).toBeInTheDocument();
  });

  it("should link to calendar apps page", () => {
    render(<AddCalendarButton />);
    expect(screen.getByTestId("button")).toHaveAttribute("href", "/apps/categories/calendar");
  });
});
