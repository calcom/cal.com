import { useLocale } from "@calcom/lib/hooks/useLocale";
import { InternalNotePresetType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";

import { RejectionReasonDialog } from "../dialog/RejectionReasonDialog";
import { useBookingConfirmation } from "./hooks/useBookingConfirmation";

interface RejectBookingButtonProps {
  bookingId: number;
  bookingUid: string;
  recurringEventId?: string | null;
  isRecurring?: boolean;
  isTabRecurring?: boolean;
  isTabUnconfirmed?: boolean;
  size?: "sm" | "base" | "lg";
  color?: "primary" | "secondary" | "minimal" | "destructive";
  className?: string;
  teamId?: number | null;
}

export function RejectBookingButton({
  bookingId,
  bookingUid,
  recurringEventId,
  isRecurring = false,
  isTabRecurring = false,
  isTabUnconfirmed = false,
  size = "base",
  color = "secondary",
  className,
  teamId,
}: RejectBookingButtonProps) {
  const { t } = useLocale();

  const { data: internalNotePresets = [] } = trpc.viewer.teams.getInternalNotesPresets.useQuery(
    {
      teamId: teamId as number,
      type: InternalNotePresetType.REJECTION,
    },
    {
      enabled: !!teamId,
    }
  );

  const { bookingConfirm, handleReject, isPending, rejectionDialogIsOpen, setRejectionDialogIsOpen } =
    useBookingConfirmation({
      isRecurring,
      isTabRecurring,
      isTabUnconfirmed,
    });

  const rejectLabel = (isTabRecurring || isTabUnconfirmed) && isRecurring ? t("reject_all") : t("reject");

  return (
    <>
      <RejectionReasonDialog
        isOpenDialog={rejectionDialogIsOpen}
        setIsOpenDialog={setRejectionDialogIsOpen}
        onConfirm={(reason, internalNote) =>
          bookingConfirm({
            bookingId,
            confirmed: false,
            recurringEventId,
            reason,
            internalNote,
          })
        }
        isPending={isPending}
        internalNotePresets={internalNotePresets}
      />

      <Button
        color={color}
        size={size}
        className={className}
        onClick={handleReject}
        disabled={isPending}
        data-booking-uid={bookingUid}
        data-testid="reject">
        {rejectLabel}
      </Button>
    </>
  );
}
