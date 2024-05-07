import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { SENDER_ID, SENDER_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WorkflowActions } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  CheckboxField,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  EmailField,
  Form,
  Icon,
  Input,
  Label,
  PhoneInput,
  Select,
  Tooltip,
} from "@calcom/ui";

import { WORKFLOW_ACTIONS } from "../lib/constants";
import { onlyLettersNumbersSpaces } from "../pages/workflow";

interface IAddActionDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  addAction: (
    action: WorkflowActions,
    sendTo?: string,
    numberRequired?: boolean,
    senderId?: string,
    senderName?: string
  ) => void;
}

interface ISelectActionOption {
  label: string;
  value: WorkflowActions;
}

type AddActionFormValues = {
  action: WorkflowActions;
  sendTo?: string;
  numberRequired?: boolean;
  senderId?: string;
  senderName?: string;
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
    senderId: z
      .string()
      .refine((val) => onlyLettersNumbersSpaces(val))
      .nullable(),
    senderName: z.string().nullable(),
  });

  const form = useForm<AddActionFormValues>({
    mode: "onSubmit",
    defaultValues: {
      action: WorkflowActions.EMAIL_HOST,
      senderId: SENDER_ID,
      senderName: SENDER_NAME,
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
        form.resetField("senderId", { defaultValue: SENDER_ID });
      } else if (newValue.value === WorkflowActions.EMAIL_ADDRESS) {
        setIsEmailAddressNeeded(true);
        setIsSenderIdNeeded(false);
        setIsPhoneNumberNeeded(false);
      } else if (newValue.value === WorkflowActions.SMS_ATTENDEE) {
        setIsSenderIdNeeded(true);
        setIsEmailAddressNeeded(false);
        setIsPhoneNumberNeeded(false);
        form.resetField("senderId", { defaultValue: SENDER_ID });
      } else if (newValue.value === WorkflowActions.WHATSAPP_NUMBER) {
        setIsSenderIdNeeded(false);
        setIsPhoneNumberNeeded(true);
        setIsEmailAddressNeeded(false);
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

  const canRequirePhoneNumber = (workflowStep: string) => {
    return (
      WorkflowActions.SMS_ATTENDEE === workflowStep || WorkflowActions.WHATSAPP_ATTENDEE === workflowStep
    );
  };

  const showSender = (action: string) => {
    return (
      !isSenderIdNeeded &&
      !(WorkflowActions.WHATSAPP_NUMBER === action || WorkflowActions.WHATSAPP_ATTENDEE === action)
    );
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow type="creation" title={t("add_action")}>
        <div className="-mt-3 space-x-3">
          <Form
            form={form}
            handleSubmit={(values) => {
              addAction(
                values.action,
                values.sendTo,
                values.numberRequired,
                values.senderId,
                values.senderName
              );
              form.unregister("sendTo");
              form.unregister("action");
              form.unregister("numberRequired");
              setIsOpenDialog(false);
              setIsPhoneNumberNeeded(false);
              setIsEmailAddressNeeded(false);
              setIsSenderIdNeeded(false);
            }}>
            <div className="space-y-1">
              <Label htmlFor="label">{t("action")}:</Label>
              <Controller
                name="action"
                control={form.control}
                render={() => {
                  return (
                    <Select
                      isSearchable={false}
                      className="text-sm"
                      menuPlacement="bottom"
                      defaultValue={actionOptions[0]}
                      onChange={handleSelectAction}
                      options={actionOptions.map((option) => ({
                        ...option,
                      }))}
                      isOptionDisabled={(option: {
                        label: string;
                        value: WorkflowActions;
                        needsTeamsUpgrade: boolean;
                      }) => option.needsTeamsUpgrade}
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
                <div className="mb-5 mt-1">
                  <Controller
                    control={form.control}
                    name="sendTo"
                    render={({ field: { value, onChange } }) => (
                      <PhoneInput
                        className="rounded-md"
                        placeholder={t("enter_phone_number")}
                        id="sendTo"
                        required
                        value={value}
                        onChange={onChange}
                      />
                    )}
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
              <>
                <div className="mt-5">
                  <div className="flex items-center">
                    <Label>{t("sender_id")}</Label>
                    <Tooltip content={t("sender_id_info")}>
                      <span>
                        <Icon name="info" className="mb-2 ml-2 mr-1 mt-0.5 h-4 w-4 text-gray-500" />
                      </span>
                    </Tooltip>
                  </div>
                  <Input type="text" placeholder={SENDER_ID} maxLength={11} {...form.register(`senderId`)} />
                </div>
                {form.formState.errors && form.formState?.errors?.senderId && (
                  <p className="mt-1 text-xs text-red-500">{t("sender_id_error_message")}</p>
                )}
              </>
            )}
            {showSender(form.getValues("action")) && (
              <div className="mt-5">
                <Label>{t("sender_name")}</Label>
                <Input type="text" placeholder={SENDER_NAME} {...form.register(`senderName`)} />
              </div>
            )}
            {canRequirePhoneNumber(form.getValues("action")) && (
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
            <DialogFooter showDivider className="mt-12">
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
      </DialogContent>
    </Dialog>
  );
};
