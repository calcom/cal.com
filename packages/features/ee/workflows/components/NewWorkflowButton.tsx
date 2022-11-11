import { zodResolver } from "@hookform/resolvers/zod";
import { TimeUnit, WorkflowActions, WorkflowTriggerEvents } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useRouter } from "next/router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@calcom/ui/Dialog";
import { Icon } from "@calcom/ui/Icon";
import PhoneInput from "@calcom/ui/form/PhoneInputLazy";
import Select from "@calcom/ui/form/Select";
import { Form, TextField } from "@calcom/ui/form/fields";
import showToast from "@calcom/ui/v2/core/notifications";

import { TIME_UNIT, WORKFLOW_ACTIONS, WORKFLOW_TRIGGER_EVENTS } from "../lib/constants";
import {
  getWorkflowActionOptions,
  getWorkflowTimeUnitOptions,
  getWorkflowTriggerOptions,
} from "../lib/getOptions";

type WorkflowFormValues = {
  name: string;
  trigger: WorkflowTriggerEvents;
  action: WorkflowActions;
  time?: number;
  timeUnit?: TimeUnit;
  sendTo?: string;
};

export function NewWorkflowButton() {
  const { t } = useLocale();
  const router = useRouter();
  const [showTimeSection, setShowTimeSection] = useState(false);
  const [isPhoneNumberNeeded, setIsPhoneNumberNeeded] = useState(false);
  const triggerOptions = getWorkflowTriggerOptions(t);
  const actionOptions = getWorkflowActionOptions(t);
  const timeUnitOptions = getWorkflowTimeUnitOptions(t);

  const formSchema = z.object({
    name: z.string().min(1),
    trigger: z.enum(WORKFLOW_TRIGGER_EVENTS),
    action: z.enum(WORKFLOW_ACTIONS),
    time: z.number().min(1).optional(),
    timeUnit: z.enum(TIME_UNIT).optional(),
    sendTo: z
      .string()
      .refine((val) => isValidPhoneNumber(val))
      .optional(),
  });

  const form = useForm<WorkflowFormValues>({
    defaultValues: {
      timeUnit: TimeUnit.HOUR,
    },
    mode: "onSubmit",
    resolver: zodResolver(formSchema),
  });

  const createMutation = trpc.viewer.workflows.create.useMutation({
    onSuccess: async ({ workflow }) => {
      await router.replace("/workflows/" + workflow.id);
      setIsPhoneNumberNeeded(false);
      setShowTimeSection(false);
      showToast(t("workflow_created_successfully", { workflowName: workflow.name }), "success");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: You are not able to create this event`;
        showToast(message, "error");
      }
    },
  });

  return (
    <Dialog name="new-workflow">
      <DialogTrigger asChild>
        <Button StartIcon={Icon.FiPlus}>{t("new_workflow_btn")}</Button>
      </DialogTrigger>
      <DialogContent>
        <div className="mb-4">
          <h3 className="text-lg font-bold leading-6 text-gray-900" id="modal-title">
            {t("add_new_workflow")}
          </h3>
        </div>
        <Form
          form={form}
          handleSubmit={(values) => {
            form.clearErrors();
            createMutation.mutate(values);
          }}>
          <>
            <div className="mt-9">
              <TextField
                label={t("workflow_name")}
                placeholder={t("custom_workflow")}
                {...form.register("name")}
              />
            </div>
            <div className="mt-5 space-y-1">
              <label htmlFor="label" className="mt-5 block text-sm font-medium text-gray-700">
                {t("trigger")}:
              </label>
              <Controller
                name="trigger"
                control={form.control}
                render={() => {
                  return (
                    <Select
                      isSearchable={false}
                      className="block w-full min-w-0 flex-1 rounded-sm text-sm"
                      onChange={(val) => {
                        if (val) {
                          form.setValue("trigger", val.value);
                          form.clearErrors("trigger");
                          if (val.value === WorkflowTriggerEvents.BEFORE_EVENT) {
                            setShowTimeSection(true);
                          } else {
                            setShowTimeSection(false);
                            form.unregister("time");
                            form.unregister("timeUnit");
                          }
                        }
                      }}
                      options={triggerOptions}
                    />
                  );
                }}
              />
              {form.formState.errors.trigger && (
                <p className="mt-1 text-sm text-red-500">{form.formState.errors.trigger.message}</p>
              )}
            </div>
            {showTimeSection && (
              <div className="mt-5 mb-4 space-y-1">
                <label htmlFor="label" className="mb-2 block text-sm font-medium text-gray-700">
                  {t("how_long_before")}
                </label>
                <div className="flex">
                  <input
                    type="number"
                    min="1"
                    defaultValue={24}
                    className="mr-5 block w-32 rounded-sm border-gray-300 px-3 py-2 text-sm marker:border focus:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-800"
                    {...form.register("time", { valueAsNumber: true })}
                  />
                  <div className="w-28">
                    <Controller
                      name="timeUnit"
                      control={form.control}
                      render={() => {
                        return (
                          <Select
                            isSearchable={false}
                            className="block min-w-0 flex-1 rounded-sm text-sm"
                            onChange={(val) => {
                              if (val) {
                                form.setValue("timeUnit", val.value);
                              }
                            }}
                            defaultValue={timeUnitOptions[1]}
                            options={timeUnitOptions}
                          />
                        );
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="mt-5 space-y-1">
              <label htmlFor="label" className="block text-sm font-medium text-gray-700">
                {t("action")}:
              </label>
              <Controller
                name="action"
                control={form.control}
                render={() => {
                  return (
                    <Select
                      isSearchable={false}
                      className="block w-full min-w-0 flex-1 rounded-sm text-sm"
                      onChange={(val) => {
                        if (val) {
                          form.setValue("action", val.value);
                          form.clearErrors("action");
                          if (val.value === WorkflowActions.SMS_NUMBER) {
                            setIsPhoneNumberNeeded(true);
                          } else {
                            setIsPhoneNumberNeeded(false);
                            form.unregister("sendTo");
                          }
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
                  <PhoneInput<WorkflowFormValues>
                    control={form.control}
                    name="sendTo"
                    placeholder={t("enter_phone_number")}
                    id="sendTo"
                    required
                  />
                </div>
                {form.formState.errors.sendTo && (
                  <p className="mt-1 text-sm text-red-500">{form.formState.errors.sendTo.message}</p>
                )}
              </div>
            )}
          </>
          <div className=" mt-8 flex flex-row-reverse gap-x-2">
            <Button type="submit" disabled={createMutation.isLoading}>
              {t("continue")}
            </Button>
            <DialogClose asChild>
              <Button
                color="secondary"
                onClick={() => {
                  setShowTimeSection(false);
                  setIsPhoneNumberNeeded(false);
                  form.clearErrors();
                  form.setValue("name", "");
                }}>
                {t("cancel")}
              </Button>
            </DialogClose>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
