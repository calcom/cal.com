import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
const mockCapture = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("posthog-js", () => ({
  default: { capture: (event: string) => mockCapture(event) },
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("./MailIcon", () => ({
  MailIcon: () => <div data-testid="mail-icon" />,
}));

describe("CompanyEmailOrganizationBanner", async () => {
  const { CompanyEmailOrganizationBanner } = await import("./CompanyEmailOrganizationBanner");

  it("should render title and subtitle", () => {
    render(<CompanyEmailOrganizationBanner onDismissAction={vi.fn()} />);

    expect(screen.getByText("it_appears_you_are_using_company_email")).toBeDefined();
    expect(screen.getByText("explore_organizational_plan_description")).toBeDefined();
  });

  it("should wrap banner in a div with mb-6 class", () => {
    const { container } = render(<CompanyEmailOrganizationBanner onDismissAction={vi.fn()} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("mb-6");
  });

  it("should navigate to onboarding on upgrade click", async () => {
    render(<CompanyEmailOrganizationBanner onDismissAction={vi.fn()} />);

    await userEvent.click(screen.getByText("upgrade"));

    expect(mockCapture).toHaveBeenCalledWith("company_email_banner_upgrade_clicked");
    expect(mockPush).toHaveBeenCalledWith("/onboarding/organization/details?migrate=true");
  });

  it("should call onDismissAction on dismiss click", async () => {
    const onDismiss = vi.fn();
    render(<CompanyEmailOrganizationBanner onDismissAction={onDismiss} />);

    await userEvent.click(screen.getByText("dismiss"));

    expect(mockCapture).toHaveBeenCalledWith("company_email_banner_dismissed");
    expect(onDismiss).toHaveBeenCalled();
  });
});
