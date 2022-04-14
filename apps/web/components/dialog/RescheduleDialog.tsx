import { ClockIcon, XIcon } from "@heroicons/react/outline";
import { RescheduleResponse } from "pages/api/book/request-reschedule";
import React, { useState, Dispatch, SetStateAction } from "react";
import { useMutation } from "react-query";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import Button from "@calcom/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/Dialog";
import { TextArea } from "@calcom/ui/form/fields";

import * as fetchWrapper from "@lib/core/http/fetch-wrapper";
import { trpc } from "@lib/trpc";

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
      <DialogContent>
        <DialogClose asChild>
          <div className="fixed top-1 right-1 flex h-8 w-8 justify-center rounded-full hover:bg-gray-200">
            <XIcon className="w-4" />
          </div>
        </DialogClose>
        <div style={{ display: "flex", flexDirection: "row" }}>
          <div className="flex h-10 w-10 flex-shrink-0 justify-center rounded-full bg-[#FAFAFA]">
            <ClockIcon className="m-auto h-6 w-6"></ClockIcon>
          </div>
          <div className="px-4 pt-1">
            <DialogHeader title={t("send_reschedule_request")} />

            <p className="-mt-8 text-sm text-gray-500">{t("reschedule_modal_description")}</p>
            <p className="mt-6 mb-2 text-sm font-bold text-black">
              {t("reason_for_reschedule_request")}
              <span className="font-normal text-gray-500"> (Optional)</span>
            </p>
            <TextArea
              data-testid="reschedule_reason"
              name={t("reschedule_reason")}
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              className="mb-5 sm:mb-6"
            />

            <DialogFooter>
              <DialogClose>
                <Button color="secondary">{t("cancel")}</Button>
              </DialogClose>
              <Button
                data-testid="send_request"
                disabled={isLoading}
                onClick={() => {
                  rescheduleApi.mutate();
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
