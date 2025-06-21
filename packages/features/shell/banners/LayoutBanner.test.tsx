import { render, screen } from "@testing-library/react";

import { BannerContainer } from "./LayoutBanner";
import { InvalidAppCredentialBanners } from "@calcom/features/users/components/InvalidAppCredentialsBanner";

// Mock the components to avoid complex dependencies
jest.mock("@calcom/features/users/components/InvalidAppCredentialsBanner", () => ({
  InvalidAppCredentialBanners: ({ data }: { data: any[] }) => (
    <div data-testid="invalid-app-credential-banners">
      {data.map((app, index) => (
        <div key={index} data-testid={`invalid-app-${app.slug}`}>
          {app.name}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("@calcom/features/ee/teams/components", () => ({
  TeamsUpgradeBanner: ({ data }: { data: any }) => 
    data ? <div data-testid="teams-upgrade-banner">Teams Upgrade</div> : null,
}));

jest.mock("@calcom/features/ee/organizations/components/OrgUpgradeBanner", () => ({
  OrgUpgradeBanner: ({ data }: { data: any }) => 
    data ? <div data-testid="org-upgrade-banner">Org Upgrade</div> : null,
}));

jest.mock("@calcom/features/users/components/VerifyEmailBanner", () => ({
  VerifyEmailBanner: ({ data }: { data: any }) => 
    data ? <div data-testid="verify-email-banner">Verify Email</div> : null,
}));

jest.mock("@calcom/features/users/components/AdminPasswordBanner", () => ({
  AdminPasswordBanner: ({ data }: { data: any }) => 
    data ? <div data-testid="admin-password-banner">Admin Password</div> : null,
}));

jest.mock("@calcom/features/ee/impersonation/components/ImpersonatingBanner", () => ({
  ImpersonatingBanner: ({ data }: { data: any }) => 
    data ? <div data-testid="impersonating-banner">Impersonating</div> : null,
}));

jest.mock("@calcom/features/users/components/CalendarCredentialBanner", () => ({
  CalendarCredentialBanner: ({ data }: { data: any }) => 
    data ? <div data-testid="calendar-credential-banner">Calendar Credential</div> : null,
}));

describe("BannerContainer", () => {
  test("Should render multiple invalid app credential banners", () => {
    const banners = {
      teamUpgradeBanner: [],
      orgUpgradeBanner: [],
      verifyEmailBanner: false,
      adminPasswordBanner: null,
      impersonationBanner: null,
      calendarCredentialBanner: false,
      invalidAppCredentialBanners: [
        { name: "Google Calendar", slug: "googlecalendar" },
        { name: "Zoom", slug: "zoom" },
      ],
    };

    render(<BannerContainer banners={banners} />);

    expect(screen.getByTestId("invalid-app-credential-banners")).toBeInTheDocument();
    expect(screen.getByTestId("invalid-app-googlecalendar")).toBeInTheDocument();
    expect(screen.getByTestId("invalid-app-zoom")).toBeInTheDocument();
    expect(screen.getByText("Google Calendar")).toBeInTheDocument();
    expect(screen.getByText("Zoom")).toBeInTheDocument();
  });

  test("Should not render banners when data is empty or null", () => {
    const banners = {
      teamUpgradeBanner: [],
      orgUpgradeBanner: [],
      verifyEmailBanner: false,
      adminPasswordBanner: null,
      impersonationBanner: null,
      calendarCredentialBanner: false,
      invalidAppCredentialBanners: [],
    };

    render(<BannerContainer banners={banners} />);

    expect(screen.queryByTestId("invalid-app-credential-banners")).not.toBeInTheDocument();
    expect(screen.queryByTestId("teams-upgrade-banner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("org-upgrade-banner")).not.toBeInTheDocument();
  });

  test("Should render other banner types when they have data", () => {
    const banners = {
      teamUpgradeBanner: [{ team: { name: "Test Team" } }],
      orgUpgradeBanner: [],
      verifyEmailBanner: true,
      adminPasswordBanner: null,
      impersonationBanner: null,
      calendarCredentialBanner: false,
      invalidAppCredentialBanners: [],
    };

    render(<BannerContainer banners={banners} />);

    expect(screen.getByTestId("teams-upgrade-banner")).toBeInTheDocument();
    expect(screen.getByTestId("verify-email-banner")).toBeInTheDocument();
  });
}); 