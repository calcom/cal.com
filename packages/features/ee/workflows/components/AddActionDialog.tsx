import { zodResolver } from "@hookform/resolvers/zod";
import { WorkflowActions } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Dispatch, SetStateAction, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { SENDER_ID } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  EmailField,
  Form,
  Label,
  PhoneInput,
  Select,
  TextField,
} from "@calcom/ui";

import { WORKFLOW_ACTIONS } from "../lib/constants";
import { onlyLettersNumbersSpaces } from "../pages/workflow";

interface IAddActionDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  addAction: (action: WorkflowActions, sendTo?: string, numberRequired?: boolean, sender?: string) => void;
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

export const AddActionDialog = (props: IAddActionDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, addAction } = props;
  const [isPhoneNumberNeeded, setIsPhoneNumberNeeded] = useState(false);
  const [isSenderIdNeeded, setIsSenderIdNeeded] = useState(false);
  const [isEmailAddressNeeded, setIsEmailAddressNeeded] = useState(false);
  const { data: actionOptions } = trpc.viewer.workflows.getWorkflowActionOptions.useQuery();

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
      sender: SENDER_ID,
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

  if (!actionOptions) return null;

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent type="creation" title={t("add_action")}>
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
                        isOptionDisabled={(option: {
                          label: string;
                          value: WorkflowActions;
                          needsUpgrade: boolean;
                        }) => option.needsUpgrade}
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
                    placeholder={SENDER_ID}
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
                <DialogClose
                  onClick={() => {
                    setIsOpenDialog(false);
                    form.unregister("sendTo");
                    form.unregister("action");
                    form.unregister("numberRequired");
                    setIsPhoneNumberNeeded(false);
                    setIsEmailAddressNeeded(false);
                    setIsSenderIdNeeded(false);
                  }}
                />
                <Button type="submit">{t("add")}</Button>
              </DialogFooter>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
