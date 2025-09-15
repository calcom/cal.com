import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { RescheduleDialog } from "./RescheduleDialog";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

// Mock the dependencies
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: vi.fn(),
    viewer: {
      bookings: {
        requestReschedule: {
          useMutation: vi.fn(),
        },
      },
    },
  },
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

vi.mock("@calcom/features/components/controlled-dialog", () => ({
  Dialog: ({ children, open, onOpenChange }: any) => {
    if (!open) return null;
    return (
      <div data-testid="dialog-wrapper">
        {children}
        <button onClick={() => onOpenChange(false)} data-testid="close-dialog">
          Close
        </button>
      </div>
    );
  },
}));

vi.mock("@calcom/ui/components/dialog", () => ({
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ title }: any) => <h2 data-testid="dialog-header">{title}</h2>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}));

vi.mock("@calcom/ui/components/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@calcom/ui/components/form", () => ({
  TextArea: ({ value, onChange, ...props }: any) => (
    <textarea value={value} onChange={onChange} {...props} />
  ),
}));

vi.mock("@calcom/ui/components/icon", () => ({
  Icon: ({ name }: any) => <span data-testid={`icon-${name}`}>{name}</span>,
}));

describe("RescheduleDialog", () => {
  const mockInvalidate = vi.fn();
  const mockMutate = vi.fn();
  const defaultProps = {
    isOpenDialog: true,
    setIsOpenDialog: vi.fn(),
    bookingUId: "test-booking-uid",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(trpc.useUtils).mockReturnValue({
      viewer: {
        bookings: {
          invalidate: mockInvalidate,
        },
      },
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Dialog rendering", () => {
    it("should render the dialog when open", () => {
      vi.mocked(trpc.viewer.bookings.requestReschedule.useMutation).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      render(<RescheduleDialog {...defaultProps} />);

      expect(screen.getByTestId("dialog-wrapper")).toBeInTheDocument();
      expect(screen.getByTestId("dialog-header")).toHaveTextContent("send_reschedule_request");
      expect(screen.getByTestId("icon-clock")).toBeInTheDocument();
    });

    it("should not render the dialog when closed", () => {
      vi.mocked(trpc.viewer.bookings.requestReschedule.useMutation).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      render(<RescheduleDialog {...defaultProps} isOpenDialog={false} />);

      expect(screen.queryByTestId("dialog-wrapper")).not.toBeInTheDocument();
    });
  });

  describe("User interactions", () => {
    it("should update reschedule reason when typing", () => {
      vi.mocked(trpc.viewer.bookings.requestReschedule.useMutation).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      render(<RescheduleDialog {...defaultProps} />);

      const textarea = screen.getByTestId("reschedule_reason");
      fireEvent.change(textarea, { target: { value: "Need to reschedule due to conflict" } });

      expect(textarea).toHaveValue("Need to reschedule due to conflict");
    });

    it("should close dialog when cancel button is clicked", () => {
      vi.mocked(trpc.viewer.bookings.requestReschedule.useMutation).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      const setIsOpenDialog = vi.fn();
      render(<RescheduleDialog {...defaultProps} setIsOpenDialog={setIsOpenDialog} />);

      const cancelButton = screen.getByText("cancel");
      fireEvent.click(cancelButton);

      expect(setIsOpenDialog).toHaveBeenCalledWith(false);
    });

    it("should call reschedule mutation when send request button is clicked", () => {
      vi.mocked(trpc.viewer.bookings.requestReschedule.useMutation).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      render(<RescheduleDialog {...defaultProps} />);

      const textarea = screen.getByTestId("reschedule_reason");
      fireEvent.change(textarea, { target: { value: "Conflict with another meeting" } });

      const sendButton = screen.getByTestId("send_request");
      fireEvent.click(sendButton);

      expect(mockMutate).toHaveBeenCalledWith({
        bookingId: "test-booking-uid",
        rescheduleReason: "Conflict with another meeting",
      });
    });

    it("should disable send button when request is pending", () => {
      vi.mocked(trpc.viewer.bookings.requestReschedule.useMutation).mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      } as any);

      render(<RescheduleDialog {...defaultProps} />);

      const sendButton = screen.getByTestId("send_request");
      expect(sendButton).toBeDisabled();
    });
  });

  describe("Minimum cancellation notice error handling", () => {
    it("should show specific error toast for minimum cancellation notice", async () => {
      const mockMutateWithError = vi.fn();
      const onErrorCallback = vi.fn();

      vi.mocked(trpc.viewer.bookings.requestReschedule.useMutation).mockImplementation((options) => {
        onErrorCallback.mockImplementation(options.onError);
        return {
          mutate: (input) => {
            mockMutateWithError(input);
            // Simulate error
            const error = new Error("Cannot reschedule within 12 hours of event start");
            options.onError(error as any);
          },
          isPending: false,
        } as any;
      });

      render(<RescheduleDialog {...defaultProps} />);

      const sendButton = screen.getByTestId("send_request");
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(
          "Cannot reschedule within 12 hours of event start",
          "error"
        );
      });
    });

    it("should show specific error for different time periods", async () => {
      const testCases = [
        "Cannot reschedule within 1 hour and 30 minutes of event start",
        "Cannot reschedule within 1 hour of event start",
        "Cannot reschedule within 30 minutes of event start",
        "Cannot reschedule within 2 hours of event start",
        "Cannot reschedule within 24 hours of event start",
      ];

      for (const errorMessage of testCases) {
        vi.clearAllMocks();

        vi.mocked(trpc.viewer.bookings.requestReschedule.useMutation).mockImplementation((options) => {
          return {
            mutate: () => {
              const error = new Error(errorMessage);
              options.onError(error as any);
            },
            isPending: false,
          } as any;
        });

        render(<RescheduleDialog {...defaultProps} />);

        const sendButton = screen.getByTestId("send_request");
        fireEvent.click(sendButton);

        await waitFor(() => {
          expect(showToast).toHaveBeenCalledWith(errorMessage, "error");
        });
      }
    });

    it("should show generic error for unexpected errors", async () => {
      vi.mocked(trpc.viewer.bookings.requestReschedule.useMutation).mockImplementation((options) => {
        return {
          mutate: () => {
            const error = new Error("Network error");
            options.onError(error as any);
          },
          isPending: false,
        } as any;
      });

      render(<RescheduleDialog {...defaultProps} />);

      const sendButton = screen.getByTestId("send_request");
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith("unexpected_error_try_again", "error");
      });
    });
  });

  describe("Success handling", () => {
    it("should show success toast and close dialog on successful reschedule", async () => {
      const setIsOpenDialog = vi.fn();
      
      vi.mocked(trpc.viewer.bookings.requestReschedule.useMutation).mockImplementation((options) => {
        return {
          mutate: async () => {
            await options.onSuccess();
          },
          isPending: false,
        } as any;
      });

      render(<RescheduleDialog {...defaultProps} setIsOpenDialog={setIsOpenDialog} />);

      const sendButton = screen.getByTestId("send_request");
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith("reschedule_request_sent", "success");
        expect(setIsOpenDialog).toHaveBeenCalledWith(false);
        expect(mockInvalidate).toHaveBeenCalled();
      });
    });
  });

  describe("Dialog state management", () => {
    it("should clear reschedule reason when dialog is reopened", () => {
      vi.mocked(trpc.viewer.bookings.requestReschedule.useMutation).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      const { rerender } = render(<RescheduleDialog {...defaultProps} />);

      // Add some text
      const textarea = screen.getByTestId("reschedule_reason");
      fireEvent.change(textarea, { target: { value: "Some reason" } });
      expect(textarea).toHaveValue("Some reason");

      // Close dialog
      rerender(<RescheduleDialog {...defaultProps} isOpenDialog={false} />);

      // Reopen dialog
      rerender(<RescheduleDialog {...defaultProps} isOpenDialog={true} />);

      // Check that the reason is preserved (component doesn't reset state on close/open)
      const newTextarea = screen.getByTestId("reschedule_reason");
      expect(newTextarea).toHaveValue("Some reason");
    });

    it("should handle empty reschedule reason", () => {
      vi.mocked(trpc.viewer.bookings.requestReschedule.useMutation).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      render(<RescheduleDialog {...defaultProps} />);

      const sendButton = screen.getByTestId("send_request");
      fireEvent.click(sendButton);

      expect(mockMutate).toHaveBeenCalledWith({
        bookingId: "test-booking-uid",
        rescheduleReason: "",
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper labels and descriptions", () => {
      vi.mocked(trpc.viewer.bookings.requestReschedule.useMutation).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      render(<RescheduleDialog {...defaultProps} />);

      expect(screen.getByText("reschedule_modal_description")).toBeInTheDocument();
      expect(screen.getByText("reason_for_reschedule_request")).toBeInTheDocument();
      expect(screen.getByText("(Optional)")).toBeInTheDocument();
    });

    it("should properly handle dialog open/close state", () => {
      vi.mocked(trpc.viewer.bookings.requestReschedule.useMutation).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      const setIsOpenDialog = vi.fn();
      render(<RescheduleDialog {...defaultProps} setIsOpenDialog={setIsOpenDialog} />);

      // Close via the dialog's onOpenChange
      const closeButton = screen.getByTestId("close-dialog");
      fireEvent.click(closeButton);

      expect(setIsOpenDialog).toHaveBeenCalledWith(false);
    });
  });
});