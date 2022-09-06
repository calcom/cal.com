import { zodResolver } from "@hookform/resolvers/zod";
import { WorkflowActions } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Dispatch, SetStateAction, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import PhoneInput from "@calcom/ui/form/PhoneInputLazy";
import { Button, Dialog, DialogClose, DialogContent, DialogFooter, Form, Label, Select } from "@calcom/ui/v2";

import { WORKFLOW_ACTIONS } from "../../lib/constants";
import { getWorkflowActionOptions } from "../../lib/getOptions";

interface IAddActionDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  addAction: (action: WorkflowActions, sendTo?: string) => void;
}

type AddActionFormValues = {
  action: WorkflowActions;
  sendTo?: string;
};

export const AddActionDialog = (props: IAddActionDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, addAction } = props;
  const [isPhoneNumberNeeded, setIsPhoneNumberNeeded] = useState(false);
  const actionOptions = getWorkflowActionOptions(t);

  const formSchema = z.object({
    action: z.enum(WORKFLOW_ACTIONS),
    sendTo: z
      .string()
      .refine((val) => isValidPhoneNumber(val))
      .optional(),
  });

  const form = useForm<AddActionFormValues>({
    mode: "onSubmit",
    defaultValues: {
      action: WorkflowActions.EMAIL_HOST,
    },
    resolver: zodResolver(formSchema),
  });

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent type="creation" useOwnActionButtons={true} title={t("add_action")}>
        <div className="space-x-3 ">
          <div className="pt-1">
            <Form
              form={form}
              handleSubmit={(values) => {
                addAction(values.action, values.sendTo);
                form.unregister("sendTo");
                form.unregister("action");
                setIsOpenDialog(false);
                setIsPhoneNumberNeeded(false);
              }}>
              <div className="mt-5 space-y-1">
                <Label htmlFor="label">{t("action")}:</Label>
                <Controller
                  name="action"
                  control={form.control}
                  render={() => {
                    return (
                      <Select
                        isSearchable={false}
                        className="text-sm"
                        defaultValue={actionOptions[0]}
                        onChange={(val) => {
                          if (val) {
                            form.setValue("action", val.value);
                            if (val.value === WorkflowActions.SMS_NUMBER) {
                              setIsPhoneNumberNeeded(true);
                            } else {
                              setIsPhoneNumberNeeded(false);
                              form.unregister("sendTo");
                            }
                            form.clearErrors("action");
                          }
                        }}
                        options={actionOptions}
                      />
                    );
                  }}
                />
                {form.formState.errors.action && (
                  <p className="mt-1 text-sm text-red-500">{form.formState.errors.action.message}</p>
                )}
              </div>
              {isPhoneNumberNeeded && (
                <div className="mt-5 space-y-1">
                  <Label htmlFor="sendTo">{t("phone_number")}</Label>
                  <div className="mt-1">
                    <PhoneInput<AddActionFormValues>
                      control={form.control}
                      name="sendTo"
                      className="rounded-md"
                      placeholder={t("enter_phone_number")}
                      id="sendTo"
                      required
                    />
                    {form.formState.errors.sendTo && (
                      <p className="mt-1 text-sm text-red-500">{form.formState.errors.sendTo.message}</p>
                    )}
                  </div>
                </div>
              )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    color="secondary"
                    onClick={() => {
                      setIsOpenDialog(false);
                      form.unregister("sendTo");
                      form.unregister("action");
                      setIsPhoneNumberNeeded(false);
                    }}>
                    {t("cancel")}
                  </Button>
                </DialogClose>
                <Button type="submit">{t("add")}</Button>
              </DialogFooter>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
