import type { Dispatch, SetStateAction } from "react";
import { useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, Icon } from "@calcom/ui";

import type { FormValues } from "../pages/team-sms-credits-view";

interface ISmsOveragesDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
}

export const SmsOveragesConfirmationDialog = (props: ISmsOveragesDialog) => {
  const { isOpenDialog, setIsOpenDialog } = props;
  const { t } = useLocale();

  const formMethods = useFormContext<FormValues>();

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow>
        <div className="flex flex-row space-x-3">
          <div className="bg-subtle flex h-10 w-10 flex-shrink-0 justify-center rounded-full ">
            <Icon name="user-plus" className="m-auto h-6 w-6" />
          </div>
          <div className="w-full pt-1">
            <DialogHeader title="Allow charging for additional SMS" />
            <DialogFooter>
              <Button
                onClick={() => {
                  setIsOpenDialog(false);
                  formMethods.setValue("smsOveragesEnabled", false);
                }}
                type="button"
                color="secondary">
                {t("cancel")}
              </Button>
              <Button
                loading={false}
                onClick={() => {
                  console.log("confirm");
                }}>
                {t("accept")}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
