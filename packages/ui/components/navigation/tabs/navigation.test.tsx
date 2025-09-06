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
      { name: "Dashboard", href: "/dashboard", "data-testid": "dashboard" },
      { name: "Settings", href: "/settings", icon: "atom", "data-testid": "settings" },
      { name: "Profile", href: "/profile", avatar: "user-avatar", "data-testid": "profile" },
      { name: "Disabled", href: "/disabled", disabled: true, "data-testid": "disabled" },
    ] as {
      name: string;
      href: string;
      icon?: IconName;
      avatar?: string;
      disabled?: boolean;
      "data-testid"?: string;
    }[];

    beforeEach(() => {
      vi.clearAllMocks();
    });

    test("renders all tabs with correct name and href", async () => {
      render(<HorizontalTabs tabs={mockTabs} />);

      for (const tab of mockTabs) {
        const tabElement = screen.getByTestId(`horizontal-tab-${tab["data-testid"]}`);
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

      const tabElement = screen.getByTestId(`horizontal-tab-${disabledTab["data-testid"]}`);

      await expect(tabElement).toHaveAttribute("aria-disabled", "true");
    });

    test("renders actions when provided", async () => {
      const mockAction = <button>Add New</button>;
      render(<HorizontalTabs tabs={mockTabs} actions={mockAction} />);

      expect(screen.getByRole("button", { name: "Add New" })).toBeInTheDocument();
    });

    test("handles tab click events", () => {
      const handleClick = vi.fn();
      const tabsWithClick = [{ name: "Tab", href: "/tab", onClick: handleClick, "data-testid": "tab" }];

      render(<HorizontalTabs tabs={tabsWithClick} />);
      fireEvent.click(screen.getByTestId("horizontal-tab-tab"));

      expect(handleClick).toHaveBeenCalledWith("Tab");
    });

    describe("scroll behavior", () => {
      const manyTabs = Array.from({ length: 20 }, (_, i) => ({
        name: `Tab ${i + 1}`,
        href: `/tab-${i + 1}`,
        "data-testid": `tab-${i + 1}`,
      }));

      const setupScrollTest = (scrollLeft = 0) => {
        const { container } = render(<HorizontalTabs tabs={manyTabs} />);
        const navElement = screen.getByRole("navigation");

        Object.defineProperty(navElement, "scrollWidth", { value: 1000, configurable: true });
        Object.defineProperty(navElement, "clientWidth", { value: 500, configurable: true });
        Object.defineProperty(navElement, "scrollLeft", { value: scrollLeft, configurable: true });

        fireEvent.scroll(navElement);
        return { navElement, container };
      };

      test("shows scroll arrows when content overflows", () => {
        setupScrollTest(0);
        expect(screen.getByLabelText("Scroll right")).toBeInTheDocument();
        expect(screen.queryByLabelText("Scroll left")).not.toBeInTheDocument();
      });

      test("shows both arrows when scrolled to middle", () => {
        setupScrollTest(100);
        expect(screen.getByLabelText("Scroll left")).toBeInTheDocument();
        expect(screen.getByLabelText("Scroll right")).toBeInTheDocument();
      });

      test("scrolls left when left arrow is clicked", () => {
        const { navElement } = setupScrollTest(100);
        const scrollBySpy = vi.fn();
        navElement.scrollBy = scrollBySpy;

        fireEvent.click(screen.getByLabelText("Scroll left"));
        expect(scrollBySpy).toHaveBeenCalledWith({ left: -300, behavior: "smooth" });
      });

      test("scrolls right when right arrow is clicked", () => {
        const { navElement } = setupScrollTest(0);
        const scrollBySpy = vi.fn();
        navElement.scrollBy = scrollBySpy;

        fireEvent.click(screen.getByLabelText("Scroll right"));
        expect(scrollBySpy).toHaveBeenCalledWith({ left: 300, behavior: "smooth" });
      });
    });

    test("hides arrows when no overflow", () => {
      const fewTabs = [
        { name: "Tab 1", href: "/tab1", "data-testid": "tab1" },
        { name: "Tab 2", href: "/tab2", "data-testid": "tab2" },
      ];

      render(<HorizontalTabs tabs={fewTabs} />);

      const navElement = screen.getByRole("navigation");
      Object.defineProperty(navElement, "scrollWidth", { value: 500, configurable: true });
      Object.defineProperty(navElement, "clientWidth", { value: 500, configurable: true });

      fireEvent.scroll(navElement);

      expect(screen.queryByLabelText("Scroll left")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Scroll right")).not.toBeInTheDocument();
    });
  });

  describe("VerticalTabs", () => {
    const mockTabs = [
      {
        name: "Overview",
        href: "/overview",
        icon: "home",
        info: "Main dashboard view",
        "data-testid": "Overview",
      },
      {
        name: "External",
        href: "https://external.com",
        isExternalLink: true,
        icon: "external",
        "data-testid": "External",
      },
      {
        name: "Disabled",
        href: "/disabled",
        disabled: true,
        icon: "lock",
        "data-testid": "Disabled",
      },
      {
        name: "Child Tab",
        href: "/child",
        isChild: true,
        disableChevron: true,
        "data-testid": "Child Tab",
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
      "data-testid"?: string;
    }[];

    beforeEach(() => {
      vi.clearAllMocks();
    });

    test("renders all tabs with correct structure and attributes", async () => {
      const { container } = render(<VerticalTabs tabs={mockTabs} sticky className="custom-class" />);

      mockTabs.forEach(async (tab) => {
        const tabElement = screen.getByTestId(`vertical-tab-${tab["data-testid"]}`);
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
          const infoElement = screen.getByTestId("apps-info");
          expect(infoElement).toBeInTheDocument();
          expect(infoElement).toHaveTextContent(tab.info);
        }

        if (tab.icon) {
          expect(screen.getAllByTestId("icon-component")).toHaveLength(3);
        }
      });

      // Check sticky behavior
      await expect(container.firstChild).toHaveClass("sticky");
    });

    test("applies custom icon correctly", async () => {
      render(
        <VerticalTabs
          tabs={[
            {
              name: "Overview",
              href: "/overview",
              icon: "atom",
              info: "Main dashboard view",
            },
          ]}
          className="custom-nav"
          itemClassname="custom-item"
          iconClassName="custom-icon"
        />
      );

      const iconElement = screen.getByTestId("icon-component");
      expect(iconElement).toBeInTheDocument();
      await expect(iconElement).toHaveClass("custom-icon");
    });

    test("applies custom classNames correctly", async () => {
      render(
        <VerticalTabs
          tabs={[
            {
              name: "Overview",
              href: "/overview",
              icon: "atom",
              info: "Main dashboard view",
              "data-testid": "overview",
            },
          ]}
          className="custom-nav"
          itemClassname="custom-item"
          iconClassName="custom-icon"
        />
      );

      const nav = screen.getByTestId("vertical-tab-overview").closest("nav");
      await expect(nav).toHaveClass("custom-nav");

      const tabElement = screen.getByTestId("vertical-tab-overview");
      await expect(tabElement).toHaveClass("custom-item");

      const iconElement = screen.getByTestId("icon-component");
      await expect(iconElement).toHaveClass("custom-icon");
    });
  });
});
