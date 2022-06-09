import { PencilIcon } from "@heroicons/react/solid";
import { zodResolver } from "@hookform/resolvers/zod";
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
        options = group.eventTypes.map((eventType) => {
          return { value: String(eventType.id), label: eventType.title };
        });
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
      form.setValue("name", query.data?.name);
      form.setValue("steps", query.data?.steps);
      form.setValue("trigger", query.data?.trigger);
      form.setValue("time", query.data?.time || undefined);
      form.setValue("timeUnit", query.data?.timeUnit || undefined);
      setIsAllLoaded(true);
    }
  }, [dataUpdatedAt]);

  const formSchema = z.object({
    name: z.string().optional(),
    activeOn: z.object({ value: z.string(), label: z.string() }).array().optional(),
    trigger: z.enum(["BEFORE_EVENT", "EVENT_CANCELLED", "NEW_EVENT"]).optional(),
    time: z.number().optional(),
    timeUnit: z.enum(["DAY", "MINUTE", "HOUR"]).optional(),
    steps: z.any(), //make better type
  });

  const form = useForm<FormValues>({
    defaultValues: {
      name: query.data?.name,
      steps: query.data?.steps,
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
                      <div className="mt-10 rounded-sm border border-gray-200 bg-white px-5 pt-10 pb-5">
                        {form.getValues("trigger") && (
                          <div>
                            <WorkflowStepContainer
                              form={form}
                              trigger={form.getValues("trigger")}
                              time={form.getValues("time")}
                              timeUnit={form.getValues("timeUnit")}
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
                                  step={step}></WorkflowStepContainer>
                              );
                            })}
                          </>
                        )}
                        <div className="mt-3 flex justify-center sm:mt-5">
                          <Button color="secondary">{t("add_action")}</Button>
                        </div>
                        <div className="rtl:space-x-reverse; mt-10 flex justify-end space-x-2">
                          <Button type="submit" disabled={updateMutation.isLoading}>
                            {" "}
                            {t("save")}
                          </Button>
                        </div>
                      </div>
                    </Form>
                  </>
                </Shell>
              )}
            </>
          );
        }}
      />
    </div>
  );
}
