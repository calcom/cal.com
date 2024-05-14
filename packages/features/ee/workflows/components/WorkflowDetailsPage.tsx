import { useRouter, useSearchParams } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";

import { SENDER_ID, SENDER_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { WorkflowActions } from "@calcom/prisma/enums";
import { WorkflowTemplates } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui";
import { Button, Icon, Label, MultiSelectCheckboxes, TextField } from "@calcom/ui";

import { isSMSAction, isWhatsappAction } from "../lib/actionHelperFunctions";
import type { FormValues } from "../pages/workflow";
import { AddActionDialog } from "./AddActionDialog";
import { DeleteDialog } from "./DeleteDialog";
import WorkflowStepContainer from "./WorkflowStepContainer";

type User = RouterOutputs["viewer"]["me"];

interface Props {
  form: UseFormReturn<FormValues>;
  workflowId: number;
  selectedEventTypes: Option[];
  setSelectedEventTypes: Dispatch<SetStateAction<Option[]>>;
  teamId?: number;
  user: User;
  isMixedEventType: boolean;
  readOnly: boolean;
}

export default function WorkflowDetailsPage(props: Props) {
  const { form, workflowId, selectedEventTypes, setSelectedEventTypes, teamId, isMixedEventType } = props;
  const { t } = useLocale();
  const router = useRouter();

  const [isAddActionDialogOpen, setIsAddActionDialogOpen] = useState(false);

  const [reload, setReload] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data, isPending } = trpc.viewer.eventTypes.getByViewer.useQuery();

  const searchParams = useSearchParams();
  const eventTypeId = searchParams?.get("eventTypeId");

  const eventTypeOptions = useMemo(
    () =>
      data?.eventTypeGroups.reduce((options, group) => {
        /** don't show team event types for user workflow */
        if (!teamId && group.teamId) return options;
        /** only show correct team event types for team workflows */
        if (teamId && teamId !== group.teamId) return options;
        return [
          ...options,
          ...group.eventTypes
            .filter(
              (evType) =>
                !evType.metadata?.managedEventConfig ||
                !!evType.metadata?.managedEventConfig.unlockedFields?.workflows ||
                !!teamId
            )
            .map((eventType) => ({
              value: String(eventType.id),
              label: `${eventType.title} ${
                eventType.children && eventType.children.length ? `(+${eventType.children.length})` : ``
              }`,
            })),
        ];
      }, [] as Option[]) || [],
    [data]
  );

  let allEventTypeOptions = eventTypeOptions;
  const distinctEventTypes = new Set();

  if (!teamId && isMixedEventType) {
    allEventTypeOptions = [...eventTypeOptions, ...selectedEventTypes];
    allEventTypeOptions = allEventTypeOptions.filter((option) => {
      const duplicate = distinctEventTypes.has(option.value);
      distinctEventTypes.add(option.value);
      return !duplicate;
    });
  }

  useEffect(() => {
    const matchingOption = allEventTypeOptions.find((option) => option.value === eventTypeId);
    if (matchingOption && !selectedEventTypes.find((option) => option.value === eventTypeId)) {
      const newOptions = [...selectedEventTypes, matchingOption];
      setSelectedEventTypes(newOptions);
      form.setValue("activeOn", newOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTypeId, allEventTypeOptions]);

  const addAction = (
    action: WorkflowActions,
    sendTo?: string,
    numberRequired?: boolean,
    sender?: string,
    senderName?: string
  ) => {
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
      template: isWhatsappAction(action) ? WorkflowTemplates.REMINDER : WorkflowTemplates.CUSTOM,
      numberRequired: numberRequired || false,
      sender: isSMSAction(action) ? sender || SENDER_ID : SENDER_ID,
      senderName: !isSMSAction(action) ? senderName || SENDER_NAME : SENDER_NAME,
      numberVerificationPending: false,
      includeCalendarEvent: false,
    };
    steps?.push(step);
    form.setValue("steps", steps);
  };

  return (
    <>
      <div className="z-1 my-8 sm:my-0 md:flex">
        <div className="pl-2 pr-3 md:sticky md:top-6 md:h-0 md:pl-0">
          <div className="mb-5">
            <TextField
              data-testid="workflow-name"
              disabled={props.readOnly}
              label={`${t("workflow_name")}:`}
              type="text"
              {...form.register("name")}
            />
          </div>
          <Label>{t("which_event_type_apply")}</Label>
          <Controller
            name="activeOn"
            control={form.control}
            render={() => {
              return (
                <MultiSelectCheckboxes
                  options={allEventTypeOptions}
                  isDisabled={props.readOnly}
                  isLoading={isPending}
                  className="w-full md:w-64"
                  setSelected={setSelectedEventTypes}
                  selected={selectedEventTypes}
                  setValue={(s: Option[]) => {
                    form.setValue("activeOn", s);
                  }}
                />
              );
            }}
          />
          <div className="md:border-subtle my-7 border-transparent md:border-t" />
          {!props.readOnly && (
            <Button
              type="button"
              StartIcon="trash-2"
              color="destructive"
              className="border"
              onClick={() => setDeleteDialogOpen(true)}>
              {t("delete_workflow")}
            </Button>
          )}
          <div className="border-subtle my-7 border-t md:border-none" />
        </div>

        {/* Workflow Trigger Event & Steps */}
        <div className="bg-muted border-subtle w-full rounded-md border p-3 py-5 md:ml-3 md:p-8">
          {form.getValues("trigger") && (
            <div>
              <WorkflowStepContainer
                form={form}
                user={props.user}
                teamId={teamId}
                readOnly={props.readOnly}
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
                    user={props.user}
                    step={step}
                    reload={reload}
                    setReload={setReload}
                    teamId={teamId}
                    readOnly={props.readOnly}
                  />
                );
              })}
            </>
          )}
          {!props.readOnly && (
            <>
              <div className="my-3 flex justify-center">
                <Icon name="arrow-down" className="text-subtle stroke-[1.5px] text-3xl" />
              </div>
              <div className="flex justify-center">
                <Button
                  type="button"
                  onClick={() => setIsAddActionDialogOpen(true)}
                  color="secondary"
                  className="bg-default">
                  {t("add_action")}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      <AddActionDialog
        isOpenDialog={isAddActionDialogOpen}
        setIsOpenDialog={setIsAddActionDialogOpen}
        addAction={addAction}
      />
      <DeleteDialog
        isOpenDialog={deleteDialogOpen}
        setIsOpenDialog={setDeleteDialogOpen}
        workflowId={workflowId}
        additionalFunction={async () => router.push("/workflows")}
      />
    </>
  );
}
