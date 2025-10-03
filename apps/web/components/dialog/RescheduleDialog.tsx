import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogDescription,
} from "@calid/features/ui/components/dialog";
import { TextArea } from "@calid/features/ui/components/input/text-area";
import { triggerToast } from "@calid/features/ui/components/toast";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

interface IRescheduleDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingUId: string;
}

export const RescheduleDialog = (props: IRescheduleDialog) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { isOpenDialog, setIsOpenDialog, bookingUId: bookingId } = props;
  const [rescheduleReason, setRescheduleReason] = useState("");

  const { mutate: rescheduleApi, isPending } = trpc.viewer.bookings.requestReschedule.useMutation({
    async onSuccess() {
      triggerToast(t("reschedule_request_sent"), "success");
      setIsOpenDialog(false);
      await utils.viewer.bookings.invalidate();
    },
    onError() {
      triggerToast(t("unexpected_error_try_again"), "error");
      // @TODO: notify sentry
    },
  });

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("send_reschedule_request")}</DialogTitle>
          <DialogDescription>{t("reschedule_modal_description")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-row space-x-3">
          <div className="w-full pt-1">
            <p className="text-default text-sm font-semibold">
              {t("reason_for_reschedule_request")}
              <span className="text-subtle font-normal"> (Optional)</span>
            </p>
            <TextArea
              data-testid="reschedule_reason"
              name={t("reason_for_reschedule")}
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              className="border-default rounded-md rounded-md border"
            />
          </div>
        </div>
        <DialogFooter>
          <Button color="secondary" onClick={() => setIsOpenDialog(false)}>
            {t("cancel")}
          </Button>
          <Button
            data-testid="send_request"
            disabled={isPending}
            onClick={() => {
              rescheduleApi({
                bookingId,
                rescheduleReason,
              });
            }}>
            {t("send_reschedule_request")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
