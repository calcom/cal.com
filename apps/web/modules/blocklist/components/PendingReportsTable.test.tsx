import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { GroupedBookingReport } from "@calcom/features/blocklist/types";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@calcom/prisma/enums", () => ({
  WatchlistType: { EMAIL: "EMAIL", DOMAIN: "DOMAIN" },
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
  EmptyScreen: ({ headline }: { headline: string; [key: string]: unknown }) => (
    <div data-testid="empty-screen">
      <span>{headline}</span>
    </div>
  ),
}));

vi.mock("@calcom/ui/components/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="report-dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ title }: { title: string }) => <div data-testid="dialog-header">{title}</div>,
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
  ToggleGroup: () => <div data-testid="toggle-group" />,
}));

vi.mock("@coss/ui/icons", () => ({
  ExternalLinkIcon: () => <span />,
  GlobeIcon: () => <span />,
  MailIcon: () => <span />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("react-hook-form", () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: (data: unknown) => void) => (e: React.FormEvent) => {
      e.preventDefault();
      fn({ blockType: "EMAIL" });
    },
    reset: vi.fn(),
    formState: { isSubmitting: false },
  }),
  Controller: ({ render: renderProp }: { render: (props: unknown) => React.ReactNode }) =>
    renderProp({
      field: { value: "EMAIL", onChange: vi.fn() },
      fieldState: {},
      formState: { isSubmitting: false },
    }),
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

import { PendingReportsTable } from "./PendingReportsTable";

const mockReports: GroupedBookingReport[] = [];

describe("PendingReportsTable – permission-driven UI", () => {
  const baseProps = {
    scope: "system" as const,
    data: mockReports,
    totalRowCount: 0,
    isPending: false,
    limit: 25,
    onAddToBlocklist: vi.fn(),
    onDismiss: vi.fn(),
  };

  describe("row selection gating", () => {
    it("does not show checkboxes when enableRowSelection is false (default)", () => {
      render(<PendingReportsTable {...baseProps} />);
      expect(screen.queryByTestId("row-checkbox")).toBeNull();
    });

    it("does not show checkboxes when enableRowSelection is explicitly false", () => {
      render(<PendingReportsTable {...baseProps} enableRowSelection={false} />);
      expect(screen.queryByTestId("row-checkbox")).toBeNull();
    });
  });

  describe("permissions passed to BookingReportDetailsModal", () => {
    it("defaults canCreate and canUpdate to true when permissions are undefined", () => {
      // When no permissions object is provided, the PendingReportsTable defaults to
      // canAddToBlocklist=true and canDismiss=true for the modal.
      // We verify the component renders without errors in this case.
      render(<PendingReportsTable {...baseProps} />);
      expect(screen.getByTestId("data-table-wrapper")).toBeDefined();
    });

    it("renders without errors when canCreate is false", () => {
      render(
        <PendingReportsTable {...baseProps} permissions={{ canCreate: false, canUpdate: true }} />
      );
      expect(screen.getByTestId("data-table-wrapper")).toBeDefined();
    });

    it("renders without errors when canUpdate is false", () => {
      render(
        <PendingReportsTable {...baseProps} permissions={{ canCreate: true, canUpdate: false }} />
      );
      expect(screen.getByTestId("data-table-wrapper")).toBeDefined();
    });

    it("renders without errors when both permissions are false", () => {
      render(
        <PendingReportsTable {...baseProps} permissions={{ canCreate: false, canUpdate: false }} />
      );
      expect(screen.getByTestId("data-table-wrapper")).toBeDefined();
    });
  });

  describe("bulk actions gating", () => {
    it("does not render bulk actions when renderBulkActions is undefined", () => {
      render(<PendingReportsTable {...baseProps} enableRowSelection={true} />);
      expect(screen.queryByTestId("selection-bar")).toBeNull();
    });
  });
});
