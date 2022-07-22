import { WorkflowActions, WorkflowTemplates } from "@prisma/client";
import { useRouter } from "next/router";
import { useState, Dispatch, SetStateAction, useMemo } from "react";
import { Controller, UseFormReturn } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import showToast from "@calcom/lib/notification";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui";
import { Form } from "@calcom/ui/form/fields";
import { AddActionDialog } from "@ee/components/workflows/AddActionDialog";
import WorkflowStepContainer from "@ee/components/workflows/WorkflowStepContainer";
import { FormValues } from "@ee/pages/workflows/[workflow]";

import MultiSelectCheckboxes, { Option } from "@components/ui/form/MultiSelectCheckboxes";

interface Props {
  form: UseFormReturn<FormValues>;
  workflowId: number;
  selectedEventTypes: Option[];
  setSelectedEventTypes: Dispatch<SetStateAction<Option[]>>;
}

export default function WorkflowDetailsPage(props: Props) {
  const { form, workflowId, selectedEventTypes, setSelectedEventTypes } = props;
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const [isAddActionDialogOpen, setIsAddActionDialogOpen] = useState(false);
  const [reload, setReload] = useState(false);
  const [editCounter, setEditCounter] = useState(0);

  const { data, isLoading } = trpc.useQuery(["viewer.eventTypes"]);

  const eventTypeOptions = useMemo(
    () =>
      data?.eventTypeGroups.reduce(
        (options, group) => [
          ...options,
          ...group.eventTypes.map((eventType) => ({
            value: String(eventType.id),
            label: eventType.title,
          })),
        ],
        [] as Option[]
      ) || [],
    [data]
  );

  const updateMutation = trpc.useMutation("viewer.workflows.update", {
    onSuccess: async ({ workflow }) => {
      if (workflow) {
        utils.setQueryData(["viewer.workflows.get", { id: +workflow.id }], workflow);

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
      steps?.length > 0
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
      workflowId: workflowId,
      reminderBody: null,
      emailSubject: null,
      template: WorkflowTemplates.REMINDER,
    };
    steps?.push(step);
    form.setValue("steps", steps);
  };

  return (
    <div>
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
                  options={eventTypeOptions}
                  isLoading={isLoading}
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
              <WorkflowStepContainer form={form} setEditCounter={setEditCounter} editCounter={editCounter} />
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
                    reload={reload}
                    setReload={setReload}
                    setEditCounter={setEditCounter}
                    editCounter={editCounter}
                  />
                );
              })}
            </>
          )}
          <div className="flex justify-center">
            <div className="h-10 border-l-2 border-gray-400" />
          </div>
          <div className="flex justify-center">
            <Button type="button" onClick={() => setIsAddActionDialogOpen(true)} color="secondary">
              {t("add_action")}
            </Button>
          </div>
          <div className="rtl:space-x-reverse; mt-10 flex justify-end space-x-2">
            <Button type="submit" disabled={updateMutation.isLoading || editCounter > 0}>
              {t("save")}
            </Button>
          </div>
        </div>
      </Form>
      <AddActionDialog
        isOpenDialog={isAddActionDialogOpen}
        setIsOpenDialog={setIsAddActionDialogOpen}
        addAction={addAction}
      />
    </div>
  );
}
