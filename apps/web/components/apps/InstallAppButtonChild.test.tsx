import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { InstallAppButtonChild } from "./InstallAppButtonChild";

// Mock credential type
type MockCredential = {
  id: number;
  delegatedToId: string;
  userId: number;
  user: { email: string };
  key: { access_token: string };
  invalid: boolean;
  teamId: null;
  team: null;
  delegationCredentialId: string;
  type:
    | `${string}_calendar`
    | `${string}_messaging`
    | `${string}_payment`
    | `${string}_video`
    | `${string}_other`
    | `${string}_automation`
    | `${string}_analytics`
    | `${string}_crm`
    | `${string}_other_calendar`;
  appId: string;
};

// Factory function to create mock credentials
const createMockCredential = (overrides: Partial<MockCredential> = {}): MockCredential => ({
  id: 1,
  type: "google_calendar" as const,
  userId: 1,
  delegatedToId: "delegation-123",
  teamId: null,
  team: null,
  user: { email: "test@example.com" },
  key: { access_token: "mock_token_123" },
  delegationCredentialId: "delegation-123",
  appId: "google-calendar",
  invalid: false,
  ...overrides,
});

// Mock the useLocale hook
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => {
      const translations = {
        install_app: "Install App",
        install_another: "Install Another",
        start_paid_trial: "Start Free Trial",
        subscribe: "Subscribe",
      };
      return translations[key as keyof typeof translations] || key;
    },
  }),
}));

describe("InstallAppButtonChild", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("is disabled when credentials exist and multiInstall is false", () => {
    const mockCredentials = [createMockCredential()];
    render(<InstallAppButtonChild multiInstall={false} credentials={mockCredentials} />);

    const button = screen.getByTestId("install-app-button");
    expect(button).toBeDisabled();
  });

  it("is enabled when credentials exist and multiInstall is true", () => {
    const mockCredentials = [createMockCredential()];
    render(<InstallAppButtonChild multiInstall={true} credentials={mockCredentials} />);

    const button = screen.getByTestId("install-app-button");
    expect(button).not.toBeDisabled();
  });

  it("is disabled when disabled prop is true regardless of credentials", () => {
    render(<InstallAppButtonChild disabled={true} multiInstall={true} credentials={[]} />);

    const button = screen.getByTestId("install-app-button");
    expect(button).toBeDisabled();
  });

  it("combines disabled prop with credential logic correctly", () => {
    const mockCredentials = [createMockCredential()];
    render(<InstallAppButtonChild disabled={true} multiInstall={false} credentials={mockCredentials} />);

    const button = screen.getByTestId("install-app-button");
    expect(button).toBeDisabled();
  });

  it("is enabled when no blocking conditions exist", () => {
    render(<InstallAppButtonChild multiInstall={false} credentials={[]} disabled={false} />);

    const button = screen.getByTestId("install-app-button");
    expect(button).not.toBeDisabled();
  });
});
