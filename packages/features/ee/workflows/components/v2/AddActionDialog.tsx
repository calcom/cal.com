import { zodResolver } from "@hookform/resolvers/zod";
import { WorkflowActions } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Dispatch, SetStateAction, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import PhoneInput from "@calcom/ui/form/PhoneInputLazy";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  EmailField,
  Form,
  Label,
  Select,
} from "@calcom/ui/v2";
import CheckboxField from "@calcom/ui/v2/core/form/Checkbox";

import { WORKFLOW_ACTIONS } from "../../lib/constants";
import { getWorkflowActionOptions } from "../../lib/getOptions";

interface IAddActionDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  addAction: (action: WorkflowActions, sendTo?: string, numberRequired?: boolean) => void;
}

type AddActionFormValues = {
  action: WorkflowActions;
  sendTo?: string;
  numberRequired?: boolean;
};

export const AddActionDialog = (props: IAddActionDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, addAction } = props;
  const [isPhoneNumberNeeded, setIsPhoneNumberNeeded] = useState(false);
  const [isEmailAddressNeeded, setIsEmailAddressNeeded] = useState(false);
  const actionOptions = getWorkflowActionOptions(t);

  const formSchema = z.object({
    action: z.enum(WORKFLOW_ACTIONS),
    sendTo: z
      .string()
      .refine((val) => isValidPhoneNumber(val) || val.includes("@"))
      .optional(),
    numberRequired: z.boolean().optional(),
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
                addAction(values.action, values.sendTo, values.numberRequired);
                form.unregister("sendTo");
                form.unregister("action");
                form.unregister("numberRequired");
                setIsOpenDialog(false);
                setIsPhoneNumberNeeded(false);
                setIsEmailAddressNeeded(false);
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
                              setIsEmailAddressNeeded(false);
                            } else if (val.value === WorkflowActions.EMAIL_ADDRESS) {
                              setIsEmailAddressNeeded(true);
                              setIsPhoneNumberNeeded(false);
                            } else {
                              setIsEmailAddressNeeded(false);
                              setIsPhoneNumberNeeded(false);
                            }
                            form.unregister("sendTo");
                            form.unregister("numberRequired");
                            form.clearErrors("action");
                            form.clearErrors("sendTo");
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
              {form.getValues("action") === WorkflowActions.SMS_ATTENDEE && (
                <div className="mt-5">
                  <Controller
                    name="numberRequired"
                    control={form.control}
                    render={() => (
                      <CheckboxField
                        defaultChecked={form.getValues("numberRequired") || false}
                        description={t("make_phone_number_required")}
                        onChange={(e) => form.setValue("numberRequired", e.target.checked)}
                      />
                    )}
                  />
                </div>
              )}
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
              {isEmailAddressNeeded && (
                <div className="mt-5">
                  <EmailField required label={t("email_address")} {...form.register("sendTo")} />
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
                      form.unregister("numberRequired");
                      setIsPhoneNumberNeeded(false);
                      setIsEmailAddressNeeded(false);
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
