import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ReportReason } from "@calcom/prisma/enums";

import { ReportBookingDialog } from "./ReportBookingDialog";

// Mock the TRPC hook
const mockMutate = vi.fn();
vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      bookings: {
        reportBooking: {
          useMutation: () => ({
            mutate: mockMutate,
            isPending: false,
          }),
        },
      },
    },
  },
}));

// Mock the useLocale hook
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

// Mock the toast
vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

describe("ReportBookingDialog", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    bookingId: 1,
    bookingTitle: "Test Booking",
    isUpcoming: true,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the dialog when open", () => {
    render(<ReportBookingDialog {...defaultProps} />);

    expect(screen.getByText("report_booking")).toBeInTheDocument();
    expect(screen.getByText("report_booking_subtitle")).toBeInTheDocument();
    expect(screen.getByText("reason")).toBeInTheDocument();
    expect(screen.getByText("additional_comments")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(<ReportBookingDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText("report_booking")).not.toBeInTheDocument();
  });

  it("should show cancel booking option for upcoming bookings", () => {
    render(<ReportBookingDialog {...defaultProps} isUpcoming={true} />);

    expect(screen.getByText("cancel_booking_description")).toBeInTheDocument();
    expect(screen.getByText("attendee_not_notified_report")).toBeInTheDocument();
  });

  it("should not show cancel booking option for past bookings", () => {
    render(<ReportBookingDialog {...defaultProps} isUpcoming={false} />);

    expect(screen.queryByText("cancel_booking_description")).not.toBeInTheDocument();
  });

  it("should submit report with correct data", async () => {
    render(<ReportBookingDialog {...defaultProps} />);

    // Fill out the form
    // The reason select defaults to "spam" so no need to change it

    const commentsTextarea = screen.getByRole("textbox");
    fireEvent.change(commentsTextarea, { target: { value: "Test comment" } });

    const submitButton = screen.getByRole("button", { name: /report/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        bookingId: 1,
        reason: ReportReason.SPAM,
        description: "Test comment",
        cancelBooking: false,
      });
    });
  });

  it("should submit report with cancel booking when checkbox is checked", async () => {
    render(<ReportBookingDialog {...defaultProps} />);

    // Check the cancel booking checkbox
    const cancelCheckbox = screen.getByRole("checkbox");
    fireEvent.click(cancelCheckbox);

    // Fill out the form
    // The reason select defaults to "spam" so no need to change it

    const submitButton = screen.getByRole("button", { name: /report_and_cancel/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        bookingId: 1,
        reason: ReportReason.SPAM,
        description: undefined,
        cancelBooking: true,
      });
    });
  });

  it("should call onClose when cancel button is clicked", () => {
    const onClose = vi.fn();
    render(<ReportBookingDialog {...defaultProps} onClose={onClose} />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("should show correct button text based on cancel booking state", () => {
    render(<ReportBookingDialog {...defaultProps} />);

    // Initially should show "Report"
    expect(screen.getByRole("button", { name: /^report$/i })).toBeInTheDocument();

    // Check the cancel booking checkbox
    const cancelCheckbox = screen.getByRole("checkbox");
    fireEvent.click(cancelCheckbox);

    // Should now show "Report and Cancel"
    expect(screen.getByRole("button", { name: /report_and_cancel/i })).toBeInTheDocument();
  });
});
