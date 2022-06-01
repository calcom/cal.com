import { PlusIcon } from "@heroicons/react/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { WorkflowTriggerEvents } from "@prisma/client";
import { WorkflowActions } from "@prisma/client";
import { TimeUnit } from "@prisma/client";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Controller } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { Button } from "@calcom/ui";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@calcom/ui/Dialog";
import { Form, TextField } from "@calcom/ui/form/fields";

import { HttpError } from "@lib/core/http/error";
import { trpc } from "@lib/trpc";
import { WORKFLOW_TRIGGER_EVENTS } from "@lib/workflows/constants";
import { WORKFLOW_ACTIONS } from "@lib/workflows/constants";
import { TIME_UNIT } from "@lib/workflows/constants";

import Select from "@components/ui/form/Select";

export function NewWorkflowButton() {
  const { t } = useLocale();
  const router = useRouter();
  const [showTimeSection, setShowTimeSection] = useState(false);

  const formSchema = z.object({
    name: z.string().nonempty(),
    trigger: z.string().nonempty(), //enum here
    action: z.string().nonempty(), //enum here
    time: z.number().min(1).optional(),
    timeUnit: z.string().optional(), //enum here
  });

  const form = useForm<{
    name: string;
    trigger: WorkflowTriggerEvents;
    action: WorkflowActions;
    time: number;
    timeUnit: TimeUnit;
  }>({
    resolver: zodResolver(formSchema),
  });

  const triggers = WORKFLOW_TRIGGER_EVENTS.map((triggerEvent) => {
    return { label: t(`${triggerEvent.toLowerCase()}_trigger`), value: triggerEvent };
  });

  const actions = WORKFLOW_ACTIONS.map((action) => {
    return { label: t(`${action.toLowerCase()}_action`), value: action };
  });

  const timeUnits = TIME_UNIT.map((timeUnit) => {
    return { label: t(`${timeUnit.toLowerCase()}_timeUnit`), value: timeUnit };
  });

  const createMutation = trpc.useMutation("viewer.workflows.create", {
    onSuccess: async ({ workflow }) => {
      await router.replace("/workflows/" + workflow.id);
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
    <Dialog name="new-workflow" clearQueryParamsOnClose={["copy-schedule-id"]}>
      <DialogTrigger asChild>
        <Button StartIcon={PlusIcon}>{t("new_workflow_btn")}</Button>
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
                      className="block w-full min-w-0 flex-1 rounded-sm sm:text-sm"
                      onChange={(val) => {
                        if (val) {
                          form.setValue("trigger", val.value);
                          if (val.value === WorkflowTriggerEvents.BEFORE_EVENT) {
                            setShowTimeSection(true);
                          } else {
                            setShowTimeSection(false);
                            form.unregister("time");
                            form.unregister("timeUnit");
                          }
                        }
                      }}
                      options={triggers}
                    />
                  );
                }}
              />
            </div>
            {showTimeSection && (
              <div className="mt-5 mb-4 space-y-1">
                <label htmlFor="label" className="mb-2 block text-sm font-medium text-gray-700">
                  {t("how_long_before")}
                </label>
                <div className="flex">
                  <input
                    type="number"
                    placeholder="24"
                    min="1"
                    className="mr-5 block w-32 rounded-sm border-gray-300 px-3 py-2 shadow-sm marker:border focus:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-800 sm:text-sm"
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
                            className="block min-w-0 flex-1 rounded-sm sm:text-sm"
                            onChange={(val) => {
                              if (val) {
                                form.setValue("timeUnit", val.value);
                              }
                            }}
                            defaultValue={timeUnits[1]}
                            options={timeUnits}
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
                      className="block w-full min-w-0 flex-1 rounded-sm sm:text-sm"
                      onChange={(val) => {
                        if (val) {
                          form.setValue("action", val.value);
                        }
                      }}
                      options={actions}
                    />
                  );
                }}
              />
            </div>
          </>
          <div className="mt-8 flex flex-row-reverse gap-x-2">
            <Button type="submit">{t("continue")}</Button>
            <DialogClose asChild>
              <Button
                color="secondary"
                onClick={() => {
                  setShowTimeSection(false);
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
