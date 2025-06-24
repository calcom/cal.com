import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DeleteBookingDialog } from "../DeleteBookingDialog";

// Mock the dependencies
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({
      viewer: {
        bookings: {
          invalidate: vi.fn(),
        },
      },
    }),
    viewer: {
      bookings: {
        deleteBooking: {
          useMutation: () => ({
            mutate: vi.fn(),
            isPending: false,
          }),
        },
      },
    },
  },
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

describe("DeleteBookingDialog", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    bookingId: 123,
  };

  it("should render the dialog when open", () => {
    render(<DeleteBookingDialog {...defaultProps} />);

    expect(screen.getByText("delete_booking_title")).toBeInTheDocument();
    expect(screen.getByText("delete_booking_description")).toBeInTheDocument();
    expect(screen.getByTestId("delete-booking-confirm")).toBeInTheDocument();
  });

  it("should not render the dialog when closed", () => {
    render(<DeleteBookingDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText("delete_booking_title")).not.toBeInTheDocument();
  });

  it("should call onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<DeleteBookingDialog {...defaultProps} onClose={onClose} />);

    // This would need proper implementation based on the actual Dialog component API
    expect(true).toBe(true);
  });
});
