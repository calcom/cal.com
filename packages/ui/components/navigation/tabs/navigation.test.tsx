import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { IconName } from "../../icon";
import HorizontalTabs from "./HorizontalTabs";
import VerticalTabs from "./VerticalTabs";

// Mock the hooks
vi.mock("@calcom/lib/hooks/useUrlMatchesCurrentUrl", () => ({
  useUrlMatchesCurrentUrl: () => false,
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (str: string) => str,
    isLocaleReady: true,
    i18n: {
      language: "en",
      defaultLocale: "en",
      locales: ["en"],
    },
  }),
}));

describe("Navigation Components", () => {
  describe("HorizontalTabs", () => {
    const mockTabs = [
      { name: "Dashboard", href: "/dashboard" },
      { name: "Settings", href: "/settings", icon: "atom" },
      { name: "Profile", href: "/profile", avatar: "user-avatar" },
      { name: "Disabled", href: "/disabled", disabled: true },
    ] as {
      name: string;
      href: string;
      icon?: IconName;
      avatar?: string;
      disabled?: boolean;
    }[];

    beforeEach(() => {
      vi.clearAllMocks();
    });

    test("renders all tabs with correct name and href", async () => {
      render(<HorizontalTabs tabs={mockTabs} />);

      for (const tab of mockTabs) {
        const tabElement = screen.getByRole("link", { name: tab.name });
        expect(tabElement).toBeInTheDocument();
        await expect(tabElement).toHaveAttribute("href", tab.href);
      }
    });

    test("renders disabled tabs with correct aria-disabled attribute", async () => {
      render(<HorizontalTabs tabs={mockTabs} />);

      const disabledTab = mockTabs.find((tab) => tab.disabled);
      // Just to keep TS happy
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (!disabledTab) throw new Error("Test requires a disabled tab in mockTabs");

      const tabElement = screen.getByRole("link", { name: disabledTab.name });

      await expect(tabElement).toHaveAttribute("aria-disabled", "true");
    });

    test("renders actions when provided", async () => {
      const mockAction = <button>Add New</button>;
      render(<HorizontalTabs tabs={mockTabs} actions={mockAction} />);

      expect(screen.getByRole("button", { name: "Add New" })).toBeInTheDocument();
    });

    test("handles tab click events", () => {
      const handleClick = vi.fn();
      const tabsWithClick = [{ name: "Tab", href: "/tab", onClick: handleClick }];

      render(<HorizontalTabs tabs={tabsWithClick} />);
      fireEvent.click(screen.getByRole("link", { name: "Tab" }));

      expect(handleClick).toHaveBeenCalledWith("Tab");
    });
  });

  describe("VerticalTabs", () => {
    const mockTabs = [
      {
        name: "Overview",
        href: "/overview",
        icon: "home",
        info: "Main dashboard view",
      },
      {
        name: "External",
        href: "https://external.com",
        isExternalLink: true,
        icon: "external",
      },
      {
        name: "Disabled",
        href: "/disabled",
        disabled: true,
        icon: "lock",
      },
      {
        name: "Child Tab",
        href: "/child",
        isChild: true,
        disableChevron: true,
      },
    ] as {
      name: string;
      href: string;
      icon?: IconName;
      avatar?: string;
      disabled?: boolean;
      isExternalLink?: boolean;
      isChild?: boolean;
      disableChevron?: boolean;
      info?: string;
    }[];

    beforeEach(() => {
      vi.clearAllMocks();
    });

    test("renders all tabs with correct structure and attributes", async () => {
      const { container } = render(<VerticalTabs tabs={mockTabs} sticky className="custom-class" />);

      mockTabs.forEach(async (tab) => {
        const tabElement = screen.getByRole("link", { name: tab.name });
        expect(tabElement).toBeInTheDocument();
        await expect(tabElement).toHaveAttribute("href", tab.href);

        if (tab.disabled) {
          await expect(tabElement).toHaveAttribute("aria-disabled", "true");
        }

        if (tab.isExternalLink) {
          await expect(tabElement).toHaveAttribute("target", "_blank");
          expect(screen.getByTestId("external-link")).toBeInTheDocument();
        }

        if (tab.info) {
          expect(screen.getByTitle(tab.info)).toBeInTheDocument();
        }

        if (tab.icon) {
          expect(screen.getByTestId("icon-component")).toBeInTheDocument();
        }
      });

      // Check sticky behavior
      await expect(container.firstChild).toHaveClass("sticky");
    });

    test("applies custom classNames correctly", async () => {
      render(
        <VerticalTabs
          tabs={mockTabs}
          className="custom-nav"
          itemClassname="custom-item"
          iconClassName="custom-icon"
        />
      );

      await expect(screen.getByRole("navigation")).toHaveClass("custom-nav");
      mockTabs.forEach(async (tab) => {
        if (tab.icon) {
          const iconElement = screen.getByTestId("icon-component");
          await expect(iconElement).toHaveClass("custom-icon");
        }
      });
    });
  });
});
