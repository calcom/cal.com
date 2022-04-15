import { ClockIcon, XIcon } from "@heroicons/react/outline";
import dayjs from "dayjs";
import { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { useMutation } from "react-query";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import logger from "@calcom/lib/logger";
import showToast from "@calcom/lib/notification";
import Button from "@calcom/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/Dialog";

interface IConfirmDialogWipe {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  trpc: any;
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
    return fetch(`${process.env.NEXT_PUBLIC_APP_BASE_URL}` + endpoint, {
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
  const { isOpenDialog, setIsOpenDialog, trpc } = props;
  const [isLoading, setIsLoading] = useState(false);
  const today = dayjs();
  const initialDate = today.startOf("day");
  const endDate = today.endOf("day");
  const dateFormat = "ddd, MMM D, YYYY h:mm A";
  console.log({ props });
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
            <DialogHeader title={"Wipe My Calendar"} />

            <p className="mt-2 text-sm text-gray-500">
              This will cancel all upcoming meetings from: <br />{" "}
              <strong className="text-black">
                {initialDate.format(dateFormat)} - {endDate.format(dateFormat)}
              </strong>
            </p>
            <p className="mt-6 mb-2 text-sm font-bold text-black">Are you sure? This can&apos;t be undone</p>

            <DialogFooter>
              <DialogClose>
                <Button color="secondary">{t("cancel")}</Button>
              </DialogClose>
              <Button
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
                Confirm
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
