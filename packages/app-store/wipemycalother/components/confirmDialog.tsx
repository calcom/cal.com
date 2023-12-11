import { useMutation } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import logger from "@calcom/lib/logger";
import { trpc } from "@calcom/trpc/react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, showToast } from "@calcom/ui";
import { Clock } from "@calcom/ui/components/icon";

interface IConfirmDialogWipe {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
}

interface IWipeMyCalAction {
  initialDate: string;
  endDate: string;
}

const wipeMyCalAction = async (props: IWipeMyCalAction) => {
  const { initialDate, endDate } = props;
  const body = {
    initialDate,
    endDate,
  };
  try {
    const endpoint = "/api/integrations/wipemycalother/wipe";
    return fetch(`${process.env.NEXT_PUBLIC_WEBAPP_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      showToast("Error ocurred while trying to cancel bookings", "error");
    }
  }
};

export const ConfirmDialog = (props: IConfirmDialogWipe) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog } = props;
  const [isLoading, setIsLoading] = useState(false);
  const today = dayjs();
  const initialDate = today.startOf("day");
  const endDate = today.endOf("day");
  const dateFormat = "ddd, MMM D, YYYY h:mm A";

  const utils = trpc.useContext();

  const rescheduleApi = useMutation(
    async () => {
      setIsLoading(true);
      try {
        const result = await wipeMyCalAction({
          initialDate: initialDate.toISOString(),
          endDate: endDate.toISOString(),
        });
        if (result) {
          showToast(t("reschedule_request_sent"), "success");
          setIsOpenDialog(false);
        }
      } catch (error) {
        showToast(t("unexpected_error_try_again"), "error");
        // @TODO: notify
      }
      setIsLoading(false);
    },
    {
      async onSettled() {
        await utils.viewer.bookings.invalidate();
      },
    }
  );

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="flex flex-row space-x-3">
          <div className="flex h-10 w-10 flex-shrink-0 justify-center rounded-full bg-[#FAFAFA]">
            <Clock className="m-auto h-5 w-5" />
          </div>
          <div className="pt-1">
            <DialogHeader title="Wipe My Calendar" />
            <p className="text-subtle mt-2 text-sm">
              This will cancel all upcoming meetings from: <br />{" "}
              <strong className="text-emphasis">
                {initialDate.format(dateFormat)} - {endDate.format(dateFormat)}
              </strong>
            </p>
            <p className="mb-2 mt-6 text-sm">Are you sure? This can&apos;t be undone</p>
          </div>
        </div>

        <DialogFooter>
          <Button color="secondary" onClick={() => setIsOpenDialog(false)}>
            {t("cancel")}
          </Button>

          <Button
            color="primary"
            data-testid="send_request"
            disabled={isLoading}
            onClick={async () => {
              try {
                rescheduleApi.mutate();
              } catch (error) {
                if (error instanceof Error) {
                  logger.error(error.message);
                }
              }
            }}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
