import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/i18n/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@coss/ui/icons", () => ({
  InfoIcon: (props: any) => <span {...props} />,
}));

describe("DryRunMessage", async () => {
  const { DryRunMessage } = await import("@calcom/features/bookings/Booker/components/DryRunMessage");

  it("should render the dry run message", () => {
    render(<DryRunMessage />);
    expect(screen.getByTestId("dry-run-msg")).toHaveTextContent("dry_run_mode_active");
  });

  it("should dismiss when clicked", async () => {
    render(<DryRunMessage />);
    const banner = screen.getByTestId("dry-run-banner");

    await userEvent.click(banner);

    expect(screen.queryByTestId("dry-run-banner")).not.toBeInTheDocument();
  });

  it("should use top-4 when not embedded", () => {
    render(<DryRunMessage />);
    const banner = screen.getByTestId("dry-run-banner");
    expect(banner.className).toContain("top-4");
  });

  it("should use top-0 when embedded", () => {
    render(<DryRunMessage isEmbed />);
    const banner = screen.getByTestId("dry-run-banner");
    expect(banner.className).toContain("top-0");
    expect(banner.className).not.toContain("top-4");
  });
});
