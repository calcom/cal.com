import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { InstallAppButtonChild } from "./InstallAppButtonChild";

// Mock credential type
type MockCredential = {
  id: number;
  delegatedToId: string;
  userId: number | null;
  user: { email: string; name: string | null } | null;
  key: { access_token: string };
  encryptedKey: string | null;
  invalid: boolean | null;
  teamId: number | null;
  team: { name: string } | null;
  delegationCredentialId: string | null;
  type: string;
  appId: string | null;
};

// Factory function to create mock credentials
const createMockCredential = (overrides: Partial<MockCredential> = {}): MockCredential => ({
  id: 1,
  type: "google_calendar",
  userId: 1,
  delegatedToId: "delegation-123",
  teamId: null,
  team: null,
  user: { email: "test@example.com", name: "Test User" },
  key: { access_token: "mock_token_123" },
  encryptedKey: null,
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
