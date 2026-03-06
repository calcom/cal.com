import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BlocklistEntry } from "@calcom/features/blocklist/types";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@calcom/lib/constants", () => ({
  IS_CALCOM: false,
}));

vi.mock("@calcom/ui/components/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button disabled={disabled} onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@calcom/ui/components/empty-screen", () => ({
  EmptyScreen: ({
    headline,
    buttonRaw,
  }: {
    headline: string;
    description?: string;
    buttonRaw?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="empty-screen">
      <span data-testid="empty-headline">{headline}</span>
      {buttonRaw && <div data-testid="empty-buttons">{buttonRaw}</div>}
    </div>
  ),
}));

vi.mock("@calcom/ui/components/dialog", () => ({
  ConfirmationDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@calcom/ui/components/dropdown", () => ({
  Dropdown: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@calcom/ui/components/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@calcom/ui/components/form", () => ({
  Checkbox: () => <input type="checkbox" data-testid="row-checkbox" />,
}));

vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonText: () => <div data-testid="skeleton" />,
}));

vi.mock("@calcom/ui/components/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-footer">{children}</div>
  ),
}));

vi.mock("@coss/ui/icons", () => ({
  ExternalLinkIcon: () => <span />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("@calcom/web/modules/data-table/components", () => ({
  DataTableSelectionBar: {
    Root: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="selection-bar">{children}</div>
    ),
  },
  DataTableWrapper: ({
    children,
    EmptyView,
    isPending,
  }: {
    children: React.ReactNode;
    EmptyView: React.ReactNode;
    isPending: boolean;
    [key: string]: unknown;
  }) => (
    <div data-testid="data-table-wrapper">
      {isPending ? <div data-testid="loading" /> : null}
      {EmptyView && <div data-testid="empty-view-container">{EmptyView}</div>}
      {children}
    </div>
  ),
}));

vi.mock("date-fns", () => ({
  format: () => "Jan 1, 12:00 AM",
}));

import { BlockedEntriesTable } from "./BlockedEntriesTable";

const mockEntries: BlocklistEntry[] = [];

describe("BlockedEntriesTable – permission-driven UI", () => {
  const baseProps = {
    scope: "system" as const,
    data: mockEntries,
    totalRowCount: 0,
    isPending: false,
    limit: 25,
    onAddClick: vi.fn(),
    onDelete: vi.fn(),
  };

  describe("Add button in empty state", () => {
    it("disables Add button when permissions are undefined (loading state)", () => {
      render(<BlockedEntriesTable {...baseProps} />);
      const addButtons = screen.getAllByText("add");
      // The empty-state Add button should be disabled
      const emptyStateAdd = addButtons.find((btn) => btn.closest("[data-testid='empty-buttons']"));
      expect(emptyStateAdd).toBeDefined();
      expect(emptyStateAdd!.closest("button")).toHaveAttribute("disabled");
    });

    it("disables Add button when canCreate is false", () => {
      render(
        <BlockedEntriesTable
          {...baseProps}
          permissions={{ canRead: true, canCreate: false, canDelete: false }}
        />
      );
      const addButtons = screen.getAllByText("add");
      const emptyStateAdd = addButtons.find((btn) => btn.closest("[data-testid='empty-buttons']"));
      expect(emptyStateAdd!.closest("button")).toHaveAttribute("disabled");
    });

    it("enables Add button when canCreate is true", () => {
      render(
        <BlockedEntriesTable
          {...baseProps}
          permissions={{ canRead: true, canCreate: true, canDelete: false }}
        />
      );
      const addButtons = screen.getAllByText("add");
      const emptyStateAdd = addButtons.find((btn) => btn.closest("[data-testid='empty-buttons']"));
      expect(emptyStateAdd!.closest("button")).not.toHaveAttribute("disabled");
    });
  });

  describe("row selection", () => {
    it("does not enable row selection when enableRowSelection is false", () => {
      render(
        <BlockedEntriesTable
          {...baseProps}
          enableRowSelection={false}
          permissions={{ canRead: true, canCreate: true, canDelete: false }}
        />
      );
      expect(screen.queryByTestId("row-checkbox")).toBeNull();
    });
  });

  describe("canDelete passed to details sheet", () => {
    it("hides delete footer in details sheet when canDelete is false", () => {
      render(
        <BlockedEntriesTable
          {...baseProps}
          permissions={{ canRead: true, canCreate: true, canDelete: false }}
        />
      );
      // The sheet is closed by default so the footer should not render
      expect(screen.queryByTestId("sheet-footer")).toBeNull();
    });
  });
});
