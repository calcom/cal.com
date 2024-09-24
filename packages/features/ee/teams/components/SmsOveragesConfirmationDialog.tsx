import type { Dispatch, SetStateAction } from "react";
import { useFormContext, Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, Icon, TextField } from "@calcom/ui";

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
            <DialogHeader title={t("allow_charging_for_sms")} />
            <div className="mb-8 mt-8">TODO: More information here</div>
            <div className="max-w-32">
              <Controller
                name="smsOverageLimit"
                control={formMethods.control}
                render={({ field: { value, onChange } }) => (
                  <TextField
                    name={t("monthly_limit")}
                    min={1}
                    value={value || undefined}
                    onChange={onChange}
                    addOnSuffix="$"
                    type="number"
                  />
                )}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setIsOpenDialog(false);
                  formMethods.setValue("smsOveragesEnabled", false);
                  formMethods.setValue("smsOverageLimit", 0);
                }}
                type="button"
                color="secondary">
                {t("cancel")}
              </Button>
              <Button
                loading={false}
                onClick={() => {
                  setIsOpenDialog(false);
                  // run mutation to change overage limit in db
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
