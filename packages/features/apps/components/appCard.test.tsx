/* eslint-disable playwright/missing-playwright-await */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { vi, describe, expect } from "vitest";

import type { AppFrontendPayload } from "@calcom/types/App";

import { AppCard } from "./AppCard";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
  }),
  usePathname: vi.fn(),
}));

describe("Tests for AppCard component", () => {
  const mockApp: AppFrontendPayload = {
    logo: "/path/to/logo.png",
    name: "Test App",
    slug: "test-app",
    description: "Test description for the app.",
    categories: ["calendar"],
    concurrentMeetings: true,
    teamsPlanRequired: { upgradeUrl: "test" },
    type: "test_calendar",
    variant: "calendar",
    publisher: "test",
    url: "test",
    email: "test",
  };

  // Abstracted render function
  const renderAppCard = (appProps = {}, appCardProps = {}) => {
    const appData = { ...mockApp, ...appProps };
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AppCard app={appData} {...appCardProps} />;
      </QueryClientProvider>
    );
  };

  describe("Tests for app description", () => {
    it("Should render the app name correctly and display app logo with correct alt text", () => {
      renderAppCard();
      const appLogo = screen.getByAltText("Test App Logo");
      const appName = screen.getByText("Test App");
      expect(appLogo).toBeInTheDocument();
      expect(appLogo.getAttribute("src")).toBe("/path/to/logo.png");
      expect(appName).toBeInTheDocument();
    });

    it("Should render details button with correct href", () => {
      renderAppCard();
      const detailsButton = screen.getByText("details");
      expect(detailsButton).toBeInTheDocument();
      expect(detailsButton.closest("a")).toHaveAttribute("href", "/apps/test-app");
    });

    it("Should highlight the app name based on searchText", () => {
      renderAppCard({}, { searchText: "test" });
      const highlightedText = screen.getByTestId("highlighted-text");
      expect(highlightedText).toBeInTheDocument();
    });
  });

  describe("Tests for app categories", () => {
    it("Should show 'Template' badge if app is a template", () => {
      renderAppCard({ isTemplate: true });
      const templateBadge = screen.getByText("Template");
      expect(templateBadge).toBeInTheDocument();
    });

    it("Should show 'default' badge if app is default or global", () => {
      renderAppCard({ isDefault: true });
      const defaultBadge = screen.getByText("default");
      expect(defaultBadge).toBeInTheDocument();
    });
  });
});
