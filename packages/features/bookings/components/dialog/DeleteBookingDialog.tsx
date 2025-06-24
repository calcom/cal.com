import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";

interface DeleteBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: number;
  onSuccess?: () => void;
}

export function DeleteBookingDialog({ isOpen, onClose, bookingId, onSuccess }: DeleteBookingDialogProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const deleteBookingMutation = trpc.viewer.bookings.deleteBooking.useMutation({
    onSuccess: () => {
      onClose();
      showToast(t("delete_booking_successful"), "success");
      utils.viewer.bookings.invalidate();
      onSuccess?.();
    },
    onError: (err) => {
      // Map TRPC error codes to user-friendly messages
      const errorMessages: Record<string, string> = {
        NOT_FOUND: t("booking_not_found"), // Booking doesn't exist
        BAD_REQUEST: t("delete_booking_failed"), // Not a past booking
        FORBIDDEN: t("delete_booking_failed"), // Insufficient permissions
      };
      // Fallback to generic error message for unexpected error codes
      const message = errorMessages[err.data?.code as string] || t("delete_booking_failed");
      showToast(message, "error");
    },
  });

  const handleDelete = () => {
    deleteBookingMutation.mutate({ id: bookingId });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent title={t("delete_booking_title")} description={t("delete_booking_description")}>
        <DialogFooter>
          <DialogClose />
          <Button
            disabled={deleteBookingMutation.isPending}
            color="destructive"
            data-testid="delete-booking-confirm"
            onClick={handleDelete}>
            {t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
