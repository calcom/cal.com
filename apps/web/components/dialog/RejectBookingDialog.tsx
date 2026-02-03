"use client";

import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@calid/features/ui/components/dialog";
import { TextArea } from "@calid/features/ui/components/input/text-area";
import { triggerToast } from "@calid/features/ui/components/toast";
import type { Dispatch, SetStateAction } from "react";
import { useState, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookingStatus } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";

type BookingItem = RouterOutputs["viewer"]["bookings"]["calid_get"]["bookings"][number];

export type RejectBookingDialogProps = BookingItem & {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  isTabRecurring?: boolean;
  isTabUnconfirmed?: boolean;
  isRecurring?: boolean;
};

export function RejectBookingDialog(props: RejectBookingDialogProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const {
    isOpenDialog,
    setIsOpenDialog,
    id: bookingId,
    uid: bookingUid,
    isTabRecurring = false,
    isTabUnconfirmed = false,
    isRecurring = false,
  } = props;

  useEffect(() => {
    if (isOpenDialog) {
      setRejectionReason("");
    }
  }, [isOpenDialog]);

  const mutation = trpc.viewer.bookings.confirm.useMutation({
    onSuccess: (data) => {
      if (data?.status === BookingStatus.REJECTED) {
        setIsOpenDialog(false);
        triggerToast(t("booking_rejection_success"), "success");
      }
      utils.viewer.bookings.invalidate();
    },
    onError: () => {
      triggerToast(t("booking_confirmation_failed"), "error");
      utils.viewer.bookings.invalidate();
    },
  });

  const handleReject = () => {
    let body: { bookingId: number; confirmed: boolean; reason: string; recurringEventId?: string } = {
      bookingId,
      confirmed: false,
      reason: rejectionReason.trim() || "",
    };

    if ((isTabRecurring || isTabUnconfirmed) && isRecurring) {
      body = { ...body, recurringEventId: bookingUid };
    }

    mutation.mutate(body);
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent size="default">
        <DialogHeader showIcon iconName="ban" iconVariant="warning">
          <DialogTitle>{t("rejection_reason_title")}</DialogTitle>
          <DialogDescription>{t("rejection_reason_description")}</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <label htmlFor="rejectionReason" className="text-default mb-2 block text-sm font-medium">
            {t("rejection_reason")}
            <span className="text-subtle ml-1 font-normal">({t("optional")})</span>
          </label>
          <TextArea
            id="rejectionReason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder={t("rejection_reason")}
            className="border-default min-h-[100px] rounded-lg border text-sm"
          />
        </div>

        <DialogFooter>
          <DialogClose />
          <Button
            data-testid="rejection-confirm"
            StartIcon="check"
            disabled={mutation.isPending}
            color="destructive"
            onClick={handleReject}>
            {t("rejection_confirmation")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
