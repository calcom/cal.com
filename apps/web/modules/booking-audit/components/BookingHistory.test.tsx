import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { BookingAuditErrorCode } from "@calcom/features/booking-audit/lib/BookingAuditErrorCode";

// Mock useLocale
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

// Mock trpc - will be configured per test
const mockUseQuery = vi.fn();
vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      bookings: {
        getBookingHistory: {
          useQuery: (...args: unknown[]) => mockUseQuery(...args),
        },
      },
    },
  },
}));

// Mock Alert component to make assertions easier
vi.mock("@calcom/ui/components/alert", () => ({
  Alert: ({ severity, title, message }: { severity: string; title: string; message?: string }) => (
    <div data-testid="alert" data-severity={severity}>
      <span data-testid="alert-title">{title}</span>
      {message && <span data-testid="alert-message">{message}</span>}
    </div>
  ),
}));

import { BookingHistory } from "./BookingHistory";

describe("BookingHistory - error handling", () => {
  it("should show permission denied info alert when error message is ORG_MEMBER_PERMISSION_DENIED", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: {
        message: BookingAuditErrorCode.ORG_MEMBER_PERMISSION_DENIED,
      },
    });

    render(<BookingHistory bookingUid="test-uid" />);

    const alert = screen.getByTestId("alert");
    expect(alert).toHaveAttribute("data-severity", "info");
    expect(screen.getByTestId("alert-title")).toHaveTextContent("audit_logs_permission_denied_title");
    expect(screen.getByTestId("alert-message")).toHaveTextContent("audit_logs_contact_admin_for_permission");
  });

  it("should show not available info alert when error message is OWNER_NOT_IN_ORGANIZATION", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: {
        message: BookingAuditErrorCode.OWNER_NOT_IN_ORGANIZATION,
      },
    });

    render(<BookingHistory bookingUid="test-uid" />);

    const alert = screen.getByTestId("alert");
    expect(alert).toHaveAttribute("data-severity", "info");
    expect(screen.getByTestId("alert-title")).toHaveTextContent("audit_logs_not_available");
  });

  it("should show not available info alert when error message is ORGANIZATION_ID_REQUIRED", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: {
        message: BookingAuditErrorCode.ORGANIZATION_ID_REQUIRED,
      },
    });

    render(<BookingHistory bookingUid="test-uid" />);

    const alert = screen.getByTestId("alert");
    expect(alert).toHaveAttribute("data-severity", "info");
    expect(screen.getByTestId("alert-title")).toHaveTextContent("audit_logs_not_available");
  });

  it("should show not available info alert when error message is BOOKING_NOT_FOUND_OR_PERMISSION_DENIED", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: {
        message: BookingAuditErrorCode.BOOKING_NOT_FOUND_OR_PERMISSION_DENIED,
      },
    });

    render(<BookingHistory bookingUid="test-uid" />);

    const alert = screen.getByTestId("alert");
    expect(alert).toHaveAttribute("data-severity", "info");
    expect(screen.getByTestId("alert-title")).toHaveTextContent("audit_logs_not_available");
  });

  it("should show not available info alert when error message is BOOKING_HAS_NO_OWNER", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: {
        message: BookingAuditErrorCode.BOOKING_HAS_NO_OWNER,
      },
    });

    render(<BookingHistory bookingUid="test-uid" />);

    const alert = screen.getByTestId("alert");
    expect(alert).toHaveAttribute("data-severity", "info");
    expect(screen.getByTestId("alert-title")).toHaveTextContent("audit_logs_not_available");
  });

  it("should show not available info alert when error message is EVENT_TYPE_NOT_IN_ORGANIZATION", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: {
        message: BookingAuditErrorCode.EVENT_TYPE_NOT_IN_ORGANIZATION,
      },
    });

    render(<BookingHistory bookingUid="test-uid" />);

    const alert = screen.getByTestId("alert");
    expect(alert).toHaveAttribute("data-severity", "info");
    expect(screen.getByTestId("alert-title")).toHaveTextContent("audit_logs_not_available");
  });

  it("should show generic red error message for unknown errors", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: {
        message: "Something unexpected happened",
      },
    });

    render(<BookingHistory bookingUid="test-uid" />);

    expect(screen.getByText("error_loading_booking_logs")).toBeInTheDocument();
    expect(screen.getByText("Something unexpected happened")).toBeInTheDocument();
  });
});
