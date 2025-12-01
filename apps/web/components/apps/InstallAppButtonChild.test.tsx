import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { InstallAppButtonChild } from "./InstallAppButtonChild";

// Simplified type definition for credentials
type MockCredential = {
  id: string | number;
  type: string;
};

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
    const mockCredentials: MockCredential[] = [
      { id: "1", type: "google-calendar" }
    ];
    render(<InstallAppButtonChild multiInstall={false} credentials={mockCredentials} />);
    
    const button = screen.getByTestId("install-app-button");
    expect(button).toBeDisabled();
  });

  it("is enabled when credentials exist and multiInstall is true", () => {
    const mockCredentials: MockCredential[] = [
      { id: "1", type: "google-calendar" }
    ];
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
    const mockCredentials: MockCredential[] = [
      { id: "1", type: "google-calendar" }
    ];
    render(
      <InstallAppButtonChild
        disabled={true}
        multiInstall={false}
        credentials={mockCredentials}
      />
    );
    
    const button = screen.getByTestId("install-app-button");
    expect(button).toBeDisabled();
  });

  it("is enabled when no blocking conditions exist", () => {
    render(<InstallAppButtonChild multiInstall={false} credentials={[]} disabled={false} />);
    
    const button = screen.getByTestId("install-app-button");
    expect(button).not.toBeDisabled();
  });
});