import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { vi } from "vitest";

import { DeleteBookingDialog } from "../DeleteBookingDialog";

const invalidateMock = vi.fn();

vi.mock("@calcom/trpc", () => ({
  trpc: {
    useUtils: vi.fn(() => ({
      viewer: {
        bookings: {
          invalidate: invalidateMock,
        },
      },
    })),
    viewer: {
      bookings: {
        deleteBooking: {
          useMutation: vi.fn(({ onSuccess }: { onSuccess: () => void }) => ({
            mutate: () => {
              onSuccess();
            },
            isPending: false,
          })),
        },
      },
    },
  },
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

describe("DeleteBookingDialog", () => {
  const mockProps = {
    bookingId: 123,
    isOpenDialog: true,
    setIsOpenDialog: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the dialog when open", () => {
    render(<DeleteBookingDialog {...mockProps} />);
    expect(screen.getByText("delete_history_title")).toBeInTheDocument();
    expect(screen.getByText("delete_history_description")).toBeInTheDocument();
  });

  it("closes the dialog when cancel is clicked", async () => {
    render(<DeleteBookingDialog {...mockProps} />);
    fireEvent.click(screen.getByText("cancel"));
    expect(mockProps.setIsOpenDialog).toHaveBeenCalledWith(false);
  });

  it("deletes the booking and closes the dialog", () => {
    render(<DeleteBookingDialog {...mockProps} />);

    fireEvent.click(screen.getByText("confirm"));
    expect(mockProps.setIsOpenDialog).toHaveBeenCalledWith(false);
    expect(invalidateMock).toHaveBeenCalled();
  });
});
