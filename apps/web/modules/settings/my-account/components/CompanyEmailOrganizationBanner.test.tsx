import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
const mockCapture = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: vi.fn().mockReturnValue("/settings"),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
}));

vi.mock("posthog-js", () => ({
  default: { capture: (...args: unknown[]) => mockCapture(...args) },
}));

vi.mock("@calcom/ui/components/button", () => ({
  Button: ({
    children,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    color?: string;
    EndIcon?: string;
  }) => (
    <button onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("./MailIcon", () => ({
  MailIcon: () => <div data-testid="mail-icon" />,
}));

describe("CompanyEmailOrganizationBanner", async () => {
  const { CompanyEmailOrganizationBanner } = await import("./CompanyEmailOrganizationBanner");
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render banner text content", () => {
    render(<CompanyEmailOrganizationBanner onDismissAction={mockOnDismiss} />);
    expect(screen.getByText("it_appears_you_are_using_company_email")).toBeInTheDocument();
    expect(screen.getByText("explore_organizational_plan_description")).toBeInTheDocument();
  });

  it("should render dismiss and upgrade buttons", () => {
    render(<CompanyEmailOrganizationBanner onDismissAction={mockOnDismiss} />);
    expect(screen.getByText("dismiss")).toBeInTheDocument();
    expect(screen.getByText("upgrade")).toBeInTheDocument();
  });

  it("should call onDismissAction and capture posthog event when dismiss is clicked", () => {
    render(<CompanyEmailOrganizationBanner onDismissAction={mockOnDismiss} />);
    fireEvent.click(screen.getByText("dismiss"));
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    expect(mockCapture).toHaveBeenCalledWith("company_email_banner_dismissed");
  });

  it("should navigate and capture posthog event when upgrade is clicked", () => {
    render(<CompanyEmailOrganizationBanner onDismissAction={mockOnDismiss} />);
    fireEvent.click(screen.getByText("upgrade"));
    expect(mockPush).toHaveBeenCalledWith("/onboarding/organization/details?migrate=true");
    expect(mockCapture).toHaveBeenCalledWith("company_email_banner_upgrade_clicked");
  });

  it("should render MailIcon component", () => {
    render(<CompanyEmailOrganizationBanner onDismissAction={mockOnDismiss} />);
    expect(screen.getByTestId("mail-icon")).toBeInTheDocument();
  });
});
