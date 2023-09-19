/* eslint-disable playwright/missing-playwright-await */
import { fireEvent, render, screen } from "@testing-library/react";
import { PlusIcon } from "lucide-react";
import { vi } from "vitest";

import HorizontalTabs from "./HorizontalTabs";
import VerticalTabs from "./VerticalTabs";

vi.mock("@calcom/lib/hooks/useUrlMatchesCurrentUrl", () => ({
  useUrlMatchesCurrentUrl() {
    return {
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: vi.fn(),
      events: {
        on: vi.fn(),
        off: vi.fn(),
      },
      beforePopState: vi.fn(() => null),
      prefetch: vi.fn(() => null),
    };
  },
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key, isLocaleReady: true }),
}));

describe("Tests for navigation folder", () => {
  describe("Test HorizontalTabs Component", () => {
    const mockTabs = [
      { name: "Tab 1", href: "/tab1" },
      { name: "Tab 2", href: "/tab2", avatar: "Avatar" },
      { name: "Tab 3", href: "/tab3" },
    ];

    beforeEach(() => {
      vi.clearAllMocks();
    });

    test("Should render tabs with correct name and href", () => {
      render(<HorizontalTabs tabs={mockTabs} />);
      mockTabs.forEach((tab) => {
        const tabLabelElement = screen.getByTestId(`horizontal-tab-${tab.name}`);
        expect(tabLabelElement).toBeInTheDocument();

        const name = screen.getByText(tab.name);
        expect(name).toBeInTheDocument();
        expect(tabLabelElement).toHaveAttribute("href", tab.href);
      });
    });

    test("Should render actions correctly", () => {
      const handleClick = vi.fn();
      const mockActions = <button onClick={handleClick}>Actions</button>;
      render(<HorizontalTabs tabs={mockTabs} actions={mockActions} />);
      const actionsElement = screen.getByText("Actions");
      expect(actionsElement).toBeInTheDocument();
      fireEvent.click(actionsElement);

      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe("Test VerticalTabs Component", () => {
    const mockTabs = [
      {
        name: "Tab 1",
        href: "/tab1",
        disableChevron: true,
        disabled: true,
        icon: PlusIcon,
      },
      { name: "Tab 2", href: "/tab2", isExternalLink: true },
      { name: "Tab 3", href: "/tab3", info: "info" },
    ];

    beforeEach(() => {
      vi.clearAllMocks();
    });

    test("Should render tabs with correct name and href", () => {
      render(<VerticalTabs tabs={mockTabs} />);
      mockTabs.forEach((tab) => {
        const tabLabelElement = screen.getByTestId(`vertical-tab-${tab.name}`);
        expect(tabLabelElement).toBeInTheDocument();

        const name = screen.getByText(tab.name);
        expect(name).toBeInTheDocument();
        expect(tabLabelElement).toHaveAttribute("href", tab.href);
      });
    });

    test("Should render correctly if props are passed", () => {
      render(<VerticalTabs tabs={mockTabs} />);

      const iconElement = screen.getAllByTestId("icon-component");
      const externalLink = screen.getAllByTestId("external-link");
      const chevronRight = screen.getAllByTestId("chevron-right");

      mockTabs.forEach((tab) => {
        const tabName = screen.getByText(tab.name);
        expect(tabName).toBeInTheDocument();

        const aTag = screen.getByTestId(`vertical-tab-${tab.name}`);
        const tabContainer = tabName.closest("a");
        const infoElement = tabContainer?.querySelector("p[title='info']");

        expect(chevronRight.length).toEqual(mockTabs.length - 1);
        if (tab.disabled) {
          expect(aTag).tabToBeDisabled();
        } else {
          expect(aTag).not.tabToBeDisabled();
        }

        if (tab.info) {
          expect(infoElement).toBeInTheDocument();
        } else {
          expect(infoElement).toBeNull();
        }

        if (tab.isExternalLink) {
          expect(aTag).toHaveAttribute("target", "_blank");
        } else {
          expect(aTag).toHaveAttribute("target", "_self");
        }
      });

      expect(externalLink.length).toEqual(1);
      expect(iconElement.length).toEqual(1);
    });
  });
});
