import { PencilIcon } from "@heroicons/react/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  WorkflowActions,
  WorkflowTemplates,
  TimeUnit,
  WorkflowStep,
  WorkflowTriggerEvents,
} from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { Button } from "@calcom/ui";
import { Form } from "@calcom/ui/form/fields";

import { QueryCell } from "@lib/QueryCell";
import { HttpError } from "@lib/core/http/error";
import { trpc } from "@lib/trpc";
import {
  TIME_UNIT,
  WORKFLOW_ACTIONS,
  WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGER_EVENTS,
} from "@lib/workflows/constants";

import Shell from "@components/Shell";
import { AddActionDialog } from "@components/dialog/AddActionDialog";
import MultiSelectCheckboxes from "@components/ui/form/MultiSelectCheckboxes";
import WorkflowStepContainer from "@components/workflows/WorkflowStepContainer";

export type FormValues = {
  name: string;
  activeOn?: Option[];
  steps: WorkflowStep[];
  trigger: WorkflowTriggerEvents;
  time?: number;
  timeUnit?: TimeUnit;
};

export type Option = {
  value: string;
  label: string;
};

export default function WorkflowPage() {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const [editIcon, setEditIcon] = useState(true);
  const [evenTypeOptions, setEventTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<Option[]>([]);
  const [isAddActionDialogOpen, setIsAddActionDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [reload, setReload] = useState(false);

  const { data, isLoading } = trpc.useQuery(["viewer.eventTypes"]);
  const [isAllDataLoaded, setIsAllDataLoaded] = useState(false);
  const workflowId = router.query?.workflow as string;
  const query = trpc.useQuery([
    "viewer.workflows.get",
    {
      id: +workflowId,
    },
  ]);

  const { dataUpdatedAt } = query;

  useEffect(() => {
    if (data) {
      let options: Option[] = [];
      data.eventTypeGroups.forEach((group) => {
        const eventTypeOptions = group.eventTypes.map((eventType) => {
          return { value: String(eventType.id), label: eventType.title };
        });
        options = [...options, ...eventTypeOptions];
      });
      setEventTypeOptions(options);
    }
  }, [isLoading]);

  useEffect(() => {
    if (query.data) {
      setSelectedEventTypes(
        query.data.activeOn.map((active) => {
          return { value: String(active.eventType.id), label: active.eventType.title };
        }) || []
      );
      const activeOn = query.data?.activeOn
        ? query.data.activeOn.map((active) => {
            return { value: active.eventType.id.toString(), label: active.eventType.slug };
          })
        : undefined;
      form.setValue("name", query.data.name);
      form.setValue("steps", query.data.steps);
      form.setValue("trigger", query.data.trigger);
      form.setValue("time", query.data.time || undefined);
      form.setValue("timeUnit", query.data.timeUnit || undefined);
      form.setValue("activeOn", activeOn);
      setIsAllDataLoaded(true);
    }
  }, [dataUpdatedAt]);

  const formSchema = z.object({
    name: z.string(),
    activeOn: z.object({ value: z.string(), label: z.string() }).array().optional(),
    trigger: z.enum(WORKFLOW_TRIGGER_EVENTS),
    time: z.number().gte(0).optional(),
    timeUnit: z.enum(TIME_UNIT).optional(),
    steps: z
      .object({
        id: z.number(),
        stepNumber: z.number(),
        action: z.enum(WORKFLOW_ACTIONS),
        workflowId: z.number(),
        reminderBody: z.string().optional().nullable(),
        emailSubject: z.string().optional().nullable(),
        template: z.enum(WORKFLOW_TEMPLATES),
        sendTo: z
          .string()
          .refine((val) => isValidPhoneNumber(val))
          .optional()
          .nullable(),
      })
      .array(),
  });

  const defaultActiveOn = query.data?.activeOn
    ? query.data?.activeOn.map((active) => {
        return { value: active.eventType.id.toString(), label: active.eventType.slug };
      })
    : undefined;

  const form = useForm<FormValues>({
    defaultValues: {
      activeOn: defaultActiveOn,
      name: query.data?.name,
      steps: query.data?.steps as WorkflowStep[],
      trigger: query.data?.trigger,
      time: query.data?.time || undefined,
      timeUnit: query.data?.timeUnit || undefined,
    },
    resolver: zodResolver(formSchema),
  });

  const updateMutation = trpc.useMutation("viewer.workflows.update", {
    onSuccess: async ({ workflow }) => {
      if (workflow) {
        await utils.setQueryData(["viewer.workflows.get", { id: +workflowId }], workflow);

        showToast(
          t("workflow_updated_successfully", {
            workflowName: workflow.name,
          }),
          "success"
        );
      }
      await router.push("/workflows");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  const addAction = (action: WorkflowActions, sendTo?: string) => {
    const steps = form.getValues("steps");
    const id =
      steps && steps.length > 0
        ? steps.sort((a, b) => {
            return a.id - b.id;
          })[0].id - 1
        : 0;

    const step = {
      id: id > 0 ? 0 : id, //id of new steps always <= 0
      action,
      stepNumber:
        steps && steps.length > 0
          ? steps.sort((a, b) => {
              return a.stepNumber - b.stepNumber;
            })[steps.length - 1].stepNumber + 1
          : 1,
      sendTo: sendTo || null,
      workflowId: +workflowId,
      reminderBody: null,
      emailSubject: null,
      template: WorkflowTemplates.REMINDER,
    };
    steps?.push(step);
    form.setValue("steps", steps);
  };

  return (
    <div>
      <QueryCell
        query={query}
        success={({ data: workflow }) => {
          return (
            <>
              {isAllDataLoaded && (
                <Shell
                  title="Title"
                  heading={
                    <div className="group relative cursor-pointer" onClick={() => setEditIcon(false)}>
                      {editIcon ? (
                        <>
                          <h1
                            style={{ fontSize: 22, letterSpacing: "-0.0009em" }}
                            className="inline pl-0 text-gray-900 focus:text-black group-hover:text-gray-500">
                            {form.getValues("name") && form.getValues("name") !== ""
                              ? form.getValues("name")
                              : workflow?.name}
                          </h1>
                          <PencilIcon className="ml-1 -mt-1 inline h-4 w-4 text-gray-700 group-hover:text-gray-500" />
                        </>
                      ) : (
                        <div style={{ marginBottom: -11 }}>
                          <input
                            type="text"
                            autoFocus
                            style={{ top: -6, fontSize: 22 }}
                            required
                            className="relative h-10 w-full cursor-pointer border-none bg-transparent pl-0 text-gray-900 hover:text-gray-700 focus:text-black focus:outline-none focus:ring-0"
                            placeholder={t("Custom workflow")}
                            {...form.register("name")}
                            defaultValue={workflow?.name}
                            onBlur={() => {
                              setEditIcon(true);
                              form.getValues("name") === "" && form.setValue("name", workflow?.name || "");
                            }}
                          />
                        </div>
                      )}
                    </div>
                  }>
                  <>
                    <Form
                      form={form}
                      handleSubmit={async (values) => {
                        let activeOnEventTypeIds: number[] = [];
                        if (values.activeOn) {
                          activeOnEventTypeIds = values.activeOn.map((option) => {
                            return parseInt(option.value, 10);
                          });
                        }
                        updateMutation.mutate({
                          id: parseInt(router.query.workflow as string, 10),
                          name: values.name,
                          activeOn: activeOnEventTypeIds,
                          steps: values.steps,
                          trigger: values.trigger,
                          time: values.time || null,
                          timeUnit: values.timeUnit || null,
                        });
                      }}>
                      <div className="-mt-7 space-y-1">
                        <label htmlFor="label" className="blocktext-sm mb-2 font-medium text-gray-700">
                          {t("active_on")}:
                        </label>
                        <Controller
                          name="activeOn"
                          control={form.control}
                          render={() => {
                            return (
                              <MultiSelectCheckboxes
                                options={evenTypeOptions}
                                isLoading={!isAllDataLoaded}
                                setSelected={setSelectedEventTypes}
                                selected={selectedEventTypes}
                                setValue={(s: Option[]) => {
                                  form.setValue("activeOn", s);
                                }}
                              />
                            );
                          }}
                        />
                      </div>

                      {/* Workflow Trigger Event & Steps */}
                      <div className="mt-5 px-5 pt-10 pb-5">
                        {form.getValues("trigger") && (
                          <div>
                            <WorkflowStepContainer form={form} setIsEditMode={setIsEditMode} />
                          </div>
                        )}
                        {form.getValues("steps") && (
                          <>
                            {form.getValues("steps")?.map((step) => {
                              return (
                                <WorkflowStepContainer
                                  key={step.id}
                                  form={form}
                                  step={step}
                                  setIsEditMode={setIsEditMode}
                                  reload={reload}
                                  setReload={setReload}
                                />
                              );
                            })}
                          </>
                        )}
                        <div className="flex justify-center">
                          <div className="h-10 border-l-2 border-gray-400" />
                        </div>
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            onClick={() => setIsAddActionDialogOpen(true)}
                            color="secondary">
                            {t("add_action")}
                          </Button>
                        </div>
                        <div className="rtl:space-x-reverse; mt-10 flex justify-end space-x-2">
                          <Button type="submit" disabled={updateMutation.isLoading || isEditMode}>
                            {t("save")}
                          </Button>
                        </div>
                      </div>
                    </Form>
                  </>
                </Shell>
              )}
              <AddActionDialog
                isOpenDialog={isAddActionDialogOpen}
                setIsOpenDialog={setIsAddActionDialogOpen}
                addAction={addAction}
              />
            </>
          );
        }}
      />
    </div>
  );
}
