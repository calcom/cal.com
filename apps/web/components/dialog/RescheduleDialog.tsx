import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  Icon,
  showToast,
  TextArea,
} from "@calcom/ui";

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
      showToast(t("reschedule_request_sent"), "success");
      setIsOpenDialog(false);
      await utils.viewer.bookings.invalidate();
    },
    onError() {
      showToast(t("unexpected_error_try_again"), "error");
      // @TODO: notify sentry
    },
  });

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow>
        <div className="flex flex-row space-x-3">
          <div className="bg-subtle flex h-10 w-10 flex-shrink-0 justify-center rounded-full ">
            <Icon name="clock" className="m-auto h-6 w-6" />
          </div>
          <div className="pt-1">
            <DialogHeader title={t("send_reschedule_request")} />
            <p className="text-subtle text-sm">{t("reschedule_modal_description")}</p>
            <p className="text-emphasis mb-2 mt-6 text-sm font-bold">
              {t("reason_for_reschedule_request")}
              <span className="text-subtle font-normal"> (Optional)</span>
            </p>
            <TextArea
              data-testid="reschedule_reason"
              name={t("reason_for_reschedule")}
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              className="mb-5 sm:mb-6"
            />

            <DialogFooter>
              <DialogClose />
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
