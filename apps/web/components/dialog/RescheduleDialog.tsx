import { Dispatch, SetStateAction, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  showToast,
  TextArea,
  TextAreaField,
} from "@calcom/ui";
import { FiClock } from "@calcom/ui/components/icon";

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
        Icon={FiClock}
        title={t("send_reschedule_request")}
        description={t("reschedule_modal_description")}>
        <div>
          <TextAreaField
            data-testid="reschedule_reason"
            name={t("reschedule_reason")}
            label={
              <>
                {t("reason_for_reschedule_request")}
                <span className="font-normal text-gray-500"> (Optional)</span>
              </>
            }
            value={rescheduleReason}
            onChange={(e) => setRescheduleReason(e.target.value)}
            className="mb-5 sm:mb-6"
          />
        </div>

        <DialogFooter>
          <DialogClose />
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
