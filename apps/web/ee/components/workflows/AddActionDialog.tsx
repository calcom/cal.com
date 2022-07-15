import { zodResolver } from "@hookform/resolvers/zod";
import { WorkflowActions } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import React, { useState, Dispatch, SetStateAction } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/Dialog";
import Select from "@calcom/ui/form/Select";
import { Form } from "@calcom/ui/form/fields";
import { WORKFLOW_ACTIONS } from "@ee/lib/workflows/constants";
import { getWorkflowActionOptions } from "@ee/lib/workflows/getOptions";

import PhoneInput from "@components/ui/form/PhoneInput";

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
      <DialogContent>
        <div className="space-x-3 ">
          <div className="pt-1">
            <DialogHeader title={t("add_action")} />
            <Form
              form={form}
              handleSubmit={(values) => {
                addAction(values.action, values.sendTo);
                form.unregister("sendTo");
                form.unregister("action");
                setIsOpenDialog(false);
                setIsPhoneNumberNeeded(false);
              }}>
              <div className="space-y-1">
                <label htmlFor="label" className="mt-5 block text-sm font-medium text-gray-700">
                  {t("action")}:
                </label>
                <Controller
                  name="action"
                  control={form.control}
                  render={() => {
                    return (
                      <Select
                        isSearchable={false}
                        className="block w-full min-w-0 flex-1 rounded-sm sm:text-sm"
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
                  <label htmlFor="sendTo" className="block text-sm font-medium text-gray-700 dark:text-white">
                    {t("phone_number")}
                  </label>
                  <div className="mt-1">
                    <PhoneInput<AddActionFormValues>
                      control={form.control}
                      name="sendTo"
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
