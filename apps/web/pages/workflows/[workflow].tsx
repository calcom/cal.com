import { PencilIcon } from "@heroicons/react/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { WorkflowActions } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { TimeUnit, WorkflowStep, WorkflowTriggerEvents } from "@calcom/prisma/client";
import { Button } from "@calcom/ui";
import { Form } from "@calcom/ui/form/fields";

import { QueryCell } from "@lib/QueryCell";
import { HttpError } from "@lib/core/http/error";
import { trpc } from "@lib/trpc";

import Shell from "@components/Shell";
import { AddActionDialog } from "@components/dialog/AddActionDialog";
import MultiSelectCheckboxes from "@components/ui/form/MultiSelectCheckboxes";
import WorkflowStepContainer from "@components/workflows/WorkflowStepContainer";

export type FormValues = {
  name?: string;
  activeOn?: Option[];
  steps?: WorkflowStep[];
  trigger?: WorkflowTriggerEvents;
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
  const [isOpenAddActionDialog, setIsOpenAddActionDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const { data, isLoading } = trpc.useQuery(["viewer.eventTypes"]);
  const [isAllLoaded, setIsAllLoaded] = useState(false);
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
      let options: { value: string; label: string }[] = [];
      data.eventTypeGroups.forEach((group) => {
        const eventTypesGroup = group.eventTypes.map((eventType) => {
          return { value: String(eventType.id), label: eventType.title };
        });
        options = [...options, ...eventTypesGroup];
      });
      setEventTypeOptions(options);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!query.isStale) {
      setSelectedEventTypes(
        query.data?.activeOn.map((active) => {
          return { value: String(active.eventType.id), label: active.eventType.title };
        }) || []
      );
      const defaultActiveOn = query.data?.activeOn
        ? query.data?.activeOn.map((active) => {
            return { value: active.eventType.id.toString(), label: active.eventType.slug };
          })
        : undefined;

      form.setValue("name", query.data?.name);
      form.setValue("steps", query.data?.steps);
      form.setValue("trigger", query.data?.trigger);
      form.setValue("time", query.data?.time || undefined);
      form.setValue("timeUnit", query.data?.timeUnit || undefined);
      form.setValue("activeOn", defaultActiveOn);
      setIsAllLoaded(true);
    }
  }, [dataUpdatedAt]);

  const formSchema = z.object({
    name: z.string().optional(),
    activeOn: z.object({ value: z.string(), label: z.string() }).array().optional(),
    trigger: z.enum(["BEFORE_EVENT", "EVENT_CANCELLED", "NEW_EVENT"]).optional(),
    time: z.number().gte(0).optional(),
    timeUnit: z.enum(["DAY", "HOUR", "MINUTE"]).optional(),
    steps: z
      .object({
        id: z.number().optional(),
        stepNumber: z.number(),
        action: z.enum(["EMAIL_HOST", "EMAIL_ATTENDEE", "SMS_ATTENDEE", "SMS_NUMBER"]),
        workflowId: z.number(),
        sendTo: z
          .string()
          .refine((val) => isValidPhoneNumber(val))
          .optional(),
      })
      .array()
      .optional(), //make better type
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
      await router.push("/workflows");
      await utils.invalidateQueries(["viewer.workflows.get"]);
      showToast(
        t("workflow_updated_successfully", {
          workflowName: workflow.name,
        }),
        "success"
      );
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
    const step = {
      id: -1,
      action,
      stepNumber: steps ? steps[steps.length - 1].stepNumber + 1 : 1,
      sendTo: sendTo || null,
      workflowId: +workflowId,
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
              {isAllLoaded && (
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
                        console.log(values);
                        let activeOnEventTypes: number[] = [];
                        if (values.activeOn) {
                          activeOnEventTypes = values.activeOn.map((option) => {
                            return parseInt(option.value, 10);
                          });
                        }
                        updateMutation.mutate({
                          id: parseInt(router.query.workflow as string, 10),
                          name: values.name,
                          activeOn: activeOnEventTypes,
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
                                isLoading={!isAllLoaded}
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
                            <WorkflowStepContainer
                              form={form}
                              trigger={form.getValues("trigger")}
                              time={form.getValues("time")}
                              timeUnit={form.getValues("timeUnit") || undefined}
                            />
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
                                />
                              );
                            })}
                          </>
                        )}
                        <div className="mt-3 flex justify-center sm:mt-7">
                          <Button
                            type="button"
                            onClick={() => setIsOpenAddActionDialog(true)}
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
                isOpenDialog={isOpenAddActionDialog}
                setIsOpenDialog={setIsOpenAddActionDialog}
                addAction={addAction}
              />
            </>
          );
        }}
      />
    </div>
  );
}
