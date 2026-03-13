import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

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

let latestBlockType = "EMAIL";
const mockReset = vi.fn((values?: { blockType?: string }) => {
  if (values?.blockType) latestBlockType = values.blockType;
});

vi.mock("react-hook-form", () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: (data: unknown) => void) => (e: React.FormEvent) => {
      e.preventDefault();
      fn({ blockType: latestBlockType });
    },
    reset: mockReset,
    formState: { isSubmitting: false },
  }),
  Controller: ({ render: renderProp }: { render: (props: unknown) => React.ReactNode }) =>
    renderProp({
      field: { value: latestBlockType, onChange: vi.fn() },
      fieldState: {},
      formState: { isSubmitting: false },
    }),
}));

vi.mock("./EntryImpactPanel", () => ({
  EntryImpactPanel: ({ isLoading }: { isLoading: boolean }) => (
    <div data-testid="entry-impact-panel" data-loading={isLoading} />
  ),
  useEntryImpact: () => ({ data: null, isLoading: false }),
}));

import { BookingReportDetailsModal } from "./BookingReportDetailsModal";

function getForm() {
  const form = screen.getByTestId("btn-submit").closest("form");
  if (!form) throw new Error("Could not find form element");
  return form;
}

const mockEmailReport: GroupedBookingReport = {
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

const mockDomainReport: GroupedBookingReport = {
  ...mockEmailReport,
  id: "report-domain",
  bookerEmail: "@spam-factory.net",
};

describe("BookingReportDetailsModal – permission gating", () => {
  beforeEach(() => {
    latestBlockType = "EMAIL";
    mockReset.mockClear();
  });

  const baseProps = {
    scope: "system" as const,
    entry: mockEmailReport,
    isOpen: true,
    onClose: vi.fn(),
    onAddToBlocklist: vi.fn(),
    onDismiss: vi.fn(),
  };

  it("renders both action buttons enabled by default (canAddToBlocklist & canDismiss default true)", () => {
    render(<BookingReportDetailsModal {...baseProps} />);

    const submitBtn = screen.getByText("check_impact");
    const dismissBtn = screen.getByText("dont_block");

    expect(submitBtn).not.toHaveAttribute("disabled");
    expect(dismissBtn).not.toHaveAttribute("disabled");
  });

  it("disables the 'add to blocklist' button when canAddToBlocklist is false", () => {
    render(<BookingReportDetailsModal {...baseProps} canAddToBlocklist={false} />);

    const submitBtn = screen.getByText("check_impact");
    expect(submitBtn).toHaveAttribute("disabled");
  });

  it("disables the 'dont block' button when canDismiss is false", () => {
    render(<BookingReportDetailsModal {...baseProps} canDismiss={false} />);

    const dismissBtn = screen.getByText("dont_block");
    expect(dismissBtn).toHaveAttribute("disabled");
  });

  it("disables both buttons when both permissions are false", () => {
    render(<BookingReportDetailsModal {...baseProps} canAddToBlocklist={false} canDismiss={false} />);

    const submitBtn = screen.getByText("check_impact");
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

describe("BookingReportDetailsModal – two-step blast radius flow", () => {
  beforeEach(() => {
    latestBlockType = "EMAIL";
    mockReset.mockClear();
  });

  const baseProps = {
    scope: "system" as const,
    entry: mockEmailReport,
    isOpen: true,
    onClose: vi.fn(),
    onAddToBlocklist: vi.fn(),
    onDismiss: vi.fn(),
  };

  it("shows 'check_impact' button for system scope email reports", () => {
    render(<BookingReportDetailsModal {...baseProps} />);
    expect(screen.getByText("check_impact")).toBeDefined();
  });

  it("transitions to impact step on form submit for system scope", () => {
    render(<BookingReportDetailsModal {...baseProps} />);

    fireEvent.submit(getForm());

    expect(screen.getByTestId("entry-impact-panel")).toBeDefined();
    expect(screen.getByText("confirm_and_add_to_blocklist")).toBeDefined();
  });

  it("renders back button on impact step that returns to details", () => {
    render(<BookingReportDetailsModal {...baseProps} />);

    fireEvent.submit(getForm());

    const backBtn = screen.getByText("back");
    fireEvent.click(backBtn);

    expect(screen.getByText("check_impact")).toBeDefined();
    expect(screen.queryByTestId("entry-impact-panel")).toBeNull();
  });

  it("calls onAddToBlocklist with correct type on confirm from impact step", () => {
    const onAddToBlocklist = vi.fn();
    render(<BookingReportDetailsModal {...baseProps} onAddToBlocklist={onAddToBlocklist} />);

    fireEvent.submit(getForm());

    const confirmBtn = screen.getByText("confirm_and_add_to_blocklist");
    fireEvent.click(confirmBtn);

    expect(onAddToBlocklist).toHaveBeenCalledWith("spammer@example.com", "EMAIL");
  });

  it("skips impact step for organization scope and calls onAddToBlocklist directly", () => {
    const onAddToBlocklist = vi.fn();
    render(
      <BookingReportDetailsModal {...baseProps} scope="organization" onAddToBlocklist={onAddToBlocklist} />
    );

    fireEvent.submit(getForm());

    expect(onAddToBlocklist).toHaveBeenCalledWith("spammer@example.com", "EMAIL");
    expect(screen.queryByTestId("entry-impact-panel")).toBeNull();
  });
});

describe("BookingReportDetailsModal – domain report reset fix", () => {
  beforeEach(() => {
    latestBlockType = "EMAIL";
    mockReset.mockClear();
  });

  it("resets form with DOMAIN blockType when entry is a domain report", () => {
    render(
      <BookingReportDetailsModal
        scope="system"
        entry={mockDomainReport}
        isOpen={true}
        onClose={vi.fn()}
        onAddToBlocklist={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    expect(mockReset).toHaveBeenCalledWith(
      expect.objectContaining({ blockType: "DOMAIN" })
    );
  });

  it("resets form with EMAIL blockType when entry is an email report", () => {
    render(
      <BookingReportDetailsModal
        scope="system"
        entry={mockEmailReport}
        isOpen={true}
        onClose={vi.fn()}
        onAddToBlocklist={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    expect(mockReset).toHaveBeenCalledWith(
      expect.objectContaining({ blockType: "EMAIL" })
    );
  });

  it("propagates DOMAIN blockType to impact step for domain reports", () => {
    latestBlockType = "DOMAIN";
    const onAddToBlocklist = vi.fn();

    render(
      <BookingReportDetailsModal
        scope="system"
        entry={mockDomainReport}
        isOpen={true}
        onClose={vi.fn()}
        onAddToBlocklist={onAddToBlocklist}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.submit(getForm());

    const confirmBtn = screen.getByText("confirm_and_add_to_blocklist");
    fireEvent.click(confirmBtn);

    expect(onAddToBlocklist).toHaveBeenCalledWith("@spam-factory.net", "DOMAIN");
  });

  it("hides block-type toggle for domain reports", () => {
    render(
      <BookingReportDetailsModal
        scope="system"
        entry={mockDomainReport}
        isOpen={true}
        onClose={vi.fn()}
        onAddToBlocklist={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    expect(screen.queryByTestId("toggle-group")).toBeNull();
  });

  it("shows block-type toggle for email reports", () => {
    render(
      <BookingReportDetailsModal
        scope="system"
        entry={mockEmailReport}
        isOpen={true}
        onClose={vi.fn()}
        onAddToBlocklist={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getByTestId("toggle-group")).toBeDefined();
  });
});
