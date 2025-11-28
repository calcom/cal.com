import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { TextArea } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

interface IRescheduleDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingUid: string;
}

export const RescheduleDialog = (props: IRescheduleDialog) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { isOpenDialog, setIsOpenDialog, bookingUid } = props;
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
      <DialogContent enableOverflow data-testid="reschedule-dialog">
        <div className="flex flex-row md:space-x-3">
          <div className="bg-subtle hidden h-10 w-10 shrink-0 justify-center rounded-full md:flex">
            <Icon name="clock" className="m-auto h-6 w-6" />
          </div>
          <div className="w-full md:pt-1">
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
          </div>
        </div>
        <DialogFooter showDivider className="mt-8">
          <Button color="secondary" onClick={() => setIsOpenDialog(false)}>
            {t("cancel")}
          </Button>
          <Button
            data-testid="send_request"
            disabled={isPending}
            onClick={() => {
              rescheduleApi({
                bookingUid,
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
