import { zodResolver } from "@hookform/resolvers/zod";
import { WorkflowActions } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Dispatch, SetStateAction, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Checkbox, EmailField, Form, Label, TextField } from "@calcom/ui/components";
import PhoneInput from "@calcom/ui/form/PhoneInputLazy";
import { Dialog, DialogClose, DialogContent, DialogFooter, Select } from "@calcom/ui/v2";

import { WORKFLOW_ACTIONS } from "../../lib/constants";
import { getWorkflowActionOptions } from "../../lib/getOptions";
import { onlyLettersNumbersSpaces } from "../../pages/v2/workflow";

interface IAddActionDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  addAction: (action: WorkflowActions, sendTo?: string, numberRequired?: boolean, sender?: string) => void;
  isFreeUser: boolean;
}

interface ISelectActionOption {
  label: string;
  value: WorkflowActions;
}

type AddActionFormValues = {
  action: WorkflowActions;
  sendTo?: string;
  numberRequired?: boolean;
  sender?: string;
};

const cleanUpActionsForFreeUser = (actions: ISelectActionOption[]) => {
  return actions.filter(
    (item) => item.value !== WorkflowActions.SMS_ATTENDEE && item.value !== WorkflowActions.SMS_NUMBER
  );
};

export const AddActionDialog = (props: IAddActionDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, addAction, isFreeUser } = props;
  const [isPhoneNumberNeeded, setIsPhoneNumberNeeded] = useState(false);
  const [isSenderIdNeeded, setIsSenderIdNeeded] = useState(false);
  const [isEmailAddressNeeded, setIsEmailAddressNeeded] = useState(false);
  const workflowActions = getWorkflowActionOptions(t);
  const actionOptions = isFreeUser ? cleanUpActionsForFreeUser(workflowActions) : workflowActions;

  const formSchema = z.object({
    action: z.enum(WORKFLOW_ACTIONS),
    sendTo: z
      .string()
      .refine((val) => isValidPhoneNumber(val) || val.includes("@"))
      .optional(),
    numberRequired: z.boolean().optional(),
    sender: z
      .string()
      .refine((val) => onlyLettersNumbersSpaces(val))
      .nullable(),
  });

  const form = useForm<AddActionFormValues>({
    mode: "onSubmit",
    defaultValues: {
      action: WorkflowActions.EMAIL_HOST,
      sender: "Cal",
    },
    resolver: zodResolver(formSchema),
  });

  const handleSelectAction = (newValue: ISelectActionOption | null) => {
    if (newValue) {
      form.setValue("action", newValue.value);
      if (newValue.value === WorkflowActions.SMS_NUMBER) {
        setIsPhoneNumberNeeded(true);
        setIsSenderIdNeeded(true);
        setIsEmailAddressNeeded(false);
      } else if (newValue.value === WorkflowActions.EMAIL_ADDRESS) {
        setIsEmailAddressNeeded(true);
        setIsSenderIdNeeded(false);
        setIsPhoneNumberNeeded(false);
      } else if (newValue.value === WorkflowActions.SMS_ATTENDEE) {
        setIsSenderIdNeeded(true);
        setIsEmailAddressNeeded(false);
        setIsPhoneNumberNeeded(false);
      } else {
        setIsSenderIdNeeded(false);
        setIsEmailAddressNeeded(false);
        setIsPhoneNumberNeeded(false);
      }
      form.unregister("sendTo");
      form.unregister("numberRequired");
      form.clearErrors("action");
      form.clearErrors("sendTo");
    }
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent type="creation" useOwnActionButtons={true} title={t("add_action")}>
        <div className="space-x-3 ">
          <div className="pt-1">
            <Form
              form={form}
              handleSubmit={(values) => {
                addAction(values.action, values.sendTo, values.numberRequired, values.sender);
                form.unregister("sendTo");
                form.unregister("action");
                form.unregister("numberRequired");
                setIsOpenDialog(false);
                setIsPhoneNumberNeeded(false);
                setIsEmailAddressNeeded(false);
                setIsSenderIdNeeded(false);
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
                        onChange={handleSelectAction}
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
                  <div className="mt-1 mb-5">
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
              {isSenderIdNeeded && (
                <div className="mt-5">
                  <TextField
                    label={t("sender_id")}
                    type="text"
                    placeholder="Cal"
                    maxLength={11}
                    {...form.register(`sender`)}
                  />
                </div>
              )}
              {form.getValues("action") === WorkflowActions.SMS_ATTENDEE && (
                <div className="mt-5">
                  <Controller
                    name="numberRequired"
                    control={form.control}
                    render={() => (
                      <Checkbox
                        defaultChecked={form.getValues("numberRequired") || false}
                        description={t("make_phone_number_required")}
                        onChange={(e) => form.setValue("numberRequired", e.target.checked)}
                      />
                    )}
                  />
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
                      setIsSenderIdNeeded(false);
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
