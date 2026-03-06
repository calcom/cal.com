import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { GroupedBookingReport } from "@calcom/features/blocklist/types";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("@calcom/prisma/enums", () => ({
  WatchlistType: { EMAIL: "EMAIL", DOMAIN: "DOMAIN" },
}));

vi.mock("@coss/ui/icons", () => ({
  ExternalLinkIcon: () => <span />,
  GlobeIcon: () => <span />,
  MailIcon: () => <span />,
}));

vi.mock("@calcom/ui/components/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type,
    loading,
    ...rest
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: string;
    loading?: boolean;
    [key: string]: unknown;
  }) => (
    <button data-testid={`btn-${type || "button"}`} disabled={disabled} onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@calcom/ui/components/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ title }: { title: string }) => <div data-testid="dialog-header">{title}</div>,
}));

vi.mock("@calcom/ui/components/form", () => ({
  ToggleGroup: () => <div data-testid="toggle-group" />,
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

import { BookingReportDetailsModal } from "./BookingReportDetailsModal";

const mockReport: GroupedBookingReport = {
  id: "report-1",
  bookerEmail: "spammer@example.com",
  reason: "SPAM",
  description: "Spamming bookings",
  reporter: { email: "reporter@example.com" },
  booking: { uid: "booking-1", title: "Test Booking" },
  reportCount: 3,
  reports: [
    {
      id: "r1",
      bookerEmail: "spammer@example.com",
      reason: "SPAM",
      description: "Spamming bookings",
      booking: { uid: "booking-1", title: "Test Booking" },
      reportCount: 1,
      reports: [],
    },
  ] as unknown as GroupedBookingReport[],
};

describe("BookingReportDetailsModal – permission gating", () => {
  const baseProps = {
    scope: "system" as const,
    entry: mockReport,
    isOpen: true,
    onClose: vi.fn(),
    onAddToBlocklist: vi.fn(),
    onDismiss: vi.fn(),
  };

  it("renders both action buttons enabled by default (canAddToBlocklist & canDismiss default true)", () => {
    render(<BookingReportDetailsModal {...baseProps} />);

    const submitBtn = screen.getByText("add_to_system_blocklist");
    const dismissBtn = screen.getByText("dont_block");

    expect(submitBtn).not.toHaveAttribute("disabled");
    expect(dismissBtn).not.toHaveAttribute("disabled");
  });

  it("disables the 'add to blocklist' button when canAddToBlocklist is false", () => {
    render(<BookingReportDetailsModal {...baseProps} canAddToBlocklist={false} />);

    const submitBtn = screen.getByText("add_to_system_blocklist");
    expect(submitBtn).toHaveAttribute("disabled");
  });

  it("disables the 'dont block' button when canDismiss is false", () => {
    render(<BookingReportDetailsModal {...baseProps} canDismiss={false} />);

    const dismissBtn = screen.getByText("dont_block");
    expect(dismissBtn).toHaveAttribute("disabled");
  });

  it("disables both buttons when both permissions are false", () => {
    render(<BookingReportDetailsModal {...baseProps} canAddToBlocklist={false} canDismiss={false} />);

    const submitBtn = screen.getByText("add_to_system_blocklist");
    const dismissBtn = screen.getByText("dont_block");
    expect(submitBtn).toHaveAttribute("disabled");
    expect(dismissBtn).toHaveAttribute("disabled");
  });

  it("renders nothing when entry is null", () => {
    render(<BookingReportDetailsModal {...baseProps} entry={null} />);
    expect(screen.queryByTestId("dialog")).toBeNull();
  });

  it("uses organization-scoped label when scope is organization", () => {
    render(
      <BookingReportDetailsModal {...baseProps} scope="organization" canAddToBlocklist={true} />
    );
    expect(screen.getByText("add_to_blocklist")).toBeDefined();
  });

  it("does not render dialog when isOpen is false", () => {
    render(<BookingReportDetailsModal {...baseProps} isOpen={false} />);
    expect(screen.queryByTestId("dialog")).toBeNull();
  });
});
