import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";

import { useBookingConfirmation } from "./hooks/useBookingConfirmation";

interface RejectBookingButtonProps {
  bookingId: number;
  recurringEventId?: string | null;
  isRecurring?: boolean;
  isTabRecurring?: boolean;
  isTabUnconfirmed?: boolean;
  size?: "sm" | "base" | "lg";
  color?: "primary" | "secondary" | "minimal" | "destructive";
  className?: string;
}

export function RejectBookingButton({
  bookingId,
  recurringEventId,
  isRecurring = false,
  isTabRecurring = false,
  isTabUnconfirmed = false,
  size = "base",
  color = "secondary",
  className,
}: RejectBookingButtonProps) {
  const { t } = useLocale();

  const { handleReject, isPending, rejectionDialogIsOpen, setRejectionDialogIsOpen, RejectionDialog } =
    useBookingConfirmation({
      isRecurring,
      isTabRecurring,
      isTabUnconfirmed,
    });

  const rejectLabel = (isTabRecurring || isTabUnconfirmed) && isRecurring ? t("reject_all") : t("reject");

  return (
    <>
      <Dialog open={rejectionDialogIsOpen} onOpenChange={setRejectionDialogIsOpen}>
        <RejectionDialog bookingId={bookingId} recurringEventId={recurringEventId} />
      </Dialog>

      <Button
        color={color}
        size={size}
        className={className}
        onClick={handleReject}
        disabled={isPending}
        data-testid="reject">
        {rejectLabel}
      </Button>
    </>
  );
}
