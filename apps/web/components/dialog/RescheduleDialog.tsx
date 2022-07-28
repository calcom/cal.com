import { RescheduleResponse } from "pages/api/book/request-reschedule";
import React, { useState, Dispatch, SetStateAction } from "react";
import { useMutation } from "react-query";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/Icon";
import Button from "@calcom/ui/v2/Button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/v2/Dialog";
import { TextArea } from "@calcom/ui/v2/form/fields";

import * as fetchWrapper from "@lib/core/http/fetch-wrapper";

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
  const [isLoading, setIsLoading] = useState(false);
  const rescheduleApi = useMutation(
    async () => {
      setIsLoading(true);
      try {
        const result = await fetchWrapper.post<
          { bookingId: string; rescheduleReason: string },
          RescheduleResponse
        >("/api/book/request-reschedule", {
          bookingId,
          rescheduleReason,
        });

        if (result) {
          showToast(t("reschedule_request_sent"), "success");
          setIsOpenDialog(false);
        }
      } catch (error) {
        showToast(t("unexpected_error_try_again"), "error");
        // @TODO: notify sentry
      }
      setIsLoading(false);
    },
    {
      async onSettled() {
        await utils.invalidateQueries(["viewer.bookings"]);
      },
    }
  );

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent
        Icon={Icon.Clock}
        type="creation"
        title={t("send_reschedule_request")}
        description={t("reschedule_modal_description")}
        closeText={t("close")}
        actionText={t("send_reschedule_request")}
        actionDisabled={isLoading}
        actionOnClick={() => {
          rescheduleApi.mutate();
        }}>
        <div className="-mt-4">
          <p className="text-sm text-gray-800">{t("reschedule_optional")}</p>
          <TextArea
            data-testid="reschedule_reason"
            name={t("reschedule_reason")}
            value={rescheduleReason}
            onChange={(e) => setRescheduleReason(e.target.value)}
            className=""
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
