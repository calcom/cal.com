import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BlocklistEntry } from "@calcom/features/blocklist/types";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("date-fns", () => ({
  format: () => "Jan 1, 12:00 AM",
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("@calcom/ui/components/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
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
    <button data-testid="sheet-delete-btn" disabled={disabled} onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@coss/ui/icons", () => ({
  ExternalLinkIcon: () => <span data-testid="external-link-icon" />,
}));

vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonText: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-text" className={className} />
  ),
}));

vi.mock("@calcom/ui/components/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetBody: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-body">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="sheet-title">{children}</h2>
  ),
  SheetFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-footer">{children}</div>
  ),
}));

import { BlocklistEntryDetailsSheet } from "./BlocklistEntryDetailsSheet";

const mockEntry: BlocklistEntry = {
  id: "entry-1",
  value: "spam@example.com",
  type: "EMAIL" as never,
  description: "Spam entry",
};

describe("BlocklistEntryDetailsSheet – permission gating", () => {
  const baseProps = {
    scope: "system" as const,
    entry: mockEntry,
    isOpen: true,
    onClose: vi.fn(),
    handleDeleteBlocklistEntry: vi.fn(),
    isLoading: false,
  };

  it("renders the delete footer when canDelete is true", () => {
    render(<BlocklistEntryDetailsSheet {...baseProps} canDelete={true} />);
    expect(screen.getByTestId("sheet-footer")).toBeDefined();
    expect(screen.getByText("remove_from_system_blocklist")).toBeDefined();
  });

  it("hides the delete footer when canDelete is false", () => {
    render(<BlocklistEntryDetailsSheet {...baseProps} canDelete={false} />);
    expect(screen.queryByTestId("sheet-footer")).toBeNull();
    expect(screen.queryByText("remove_from_system_blocklist")).toBeNull();
  });

  it("defaults canDelete to true when prop is omitted", () => {
    render(<BlocklistEntryDetailsSheet {...baseProps} />);
    expect(screen.getByTestId("sheet-footer")).toBeDefined();
  });

  it("does not render at all when isOpen is false", () => {
    render(<BlocklistEntryDetailsSheet {...baseProps} isOpen={false} canDelete={true} />);
    expect(screen.queryByTestId("sheet")).toBeNull();
  });

  it("uses organization-scoped label when scope is organization", () => {
    render(<BlocklistEntryDetailsSheet {...baseProps} scope="organization" canDelete={true} />);
    expect(screen.getByText("remove_from_blocklist")).toBeDefined();
  });

  it("disables delete button when entry is null", () => {
    render(<BlocklistEntryDetailsSheet {...baseProps} entry={null} canDelete={true} />);
    const deleteBtn = screen.getByTestId("sheet-delete-btn");
    expect(deleteBtn).toHaveAttribute("disabled");
  });
});
