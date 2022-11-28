import { Dispatch, SetStateAction, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Dialog, DialogContent, Icon, showToast, TextArea } from "@calcom/ui";

interface IRescheduleDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingUId: string;
}

export const RescheduleDialog = (props: IRescheduleDialog) => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { isOpenDialog, setIsOpenDialog, bookingUId: bookingId } = props;
  const [rescheduleReason, setRescheduleReason] = useState("");

  const { mutate: rescheduleApi, isLoading } = trpc.viewer.bookings.requestReschedule.useMutation({
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
      <DialogContent
        Icon={Icon.FiClock}
        useOwnActionButtons
        title={t("send_reschedule_request")}
        description={t("reschedule_modal_description")}>
        <div>
          <p className="text-sm font-medium text-black">
            {t("reason_for_reschedule_request")}
            <span className="font-normal text-gray-500"> (Optional)</span>
          </p>
          <TextArea
            data-testid="reschedule_reason"
            name={t("reschedule_reason")}
            value={rescheduleReason}
            onChange={(e) => setRescheduleReason(e.target.value)}
            className="mt-2"
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            onClick={() => {
              setRescheduleReason("");
              setIsOpenDialog(false);
            }}
            color="secondary">
            {t("cancel")}
          </Button>
          <Button
            data-testid="send_request"
            disabled={isLoading}
            onClick={() => {
              rescheduleApi({
                bookingId,
                rescheduleReason,
              });
            }}>
            {t("send_reschedule_request")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
