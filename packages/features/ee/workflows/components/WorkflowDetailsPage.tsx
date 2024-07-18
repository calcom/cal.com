import { useRouter, useSearchParams } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useState, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";

import { SENDER_ID, SENDER_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { WorkflowActions } from "@calcom/prisma/enums";
import { WorkflowTemplates } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui";
import { Button, Icon, Label, MultiSelectCheckboxes, TextField, CheckboxField, InfoBadge } from "@calcom/ui";

import { isSMSAction, isWhatsappAction } from "../lib/actionHelperFunctions";
import type { FormValues } from "../pages/workflow";
import { AddActionDialog } from "./AddActionDialog";
import { DeleteDialog } from "./DeleteDialog";
import WorkflowStepContainer from "./WorkflowStepContainer";

type User = RouterOutputs["viewer"]["me"];

interface Props {
  form: UseFormReturn<FormValues>;
  workflowId: number;
  selectedOptions: Option[];
  setSelectedOptions: Dispatch<SetStateAction<Option[]>>;
  teamId?: number;
  user: User;
  readOnly: boolean;
  isOrg: boolean;
  allOptions: Option[];
}

export default function WorkflowDetailsPage(props: Props) {
  const { form, workflowId, selectedOptions, setSelectedOptions, teamId, isOrg, allOptions } = props;
  const { t } = useLocale();
  const router = useRouter();

  const [isAddActionDialogOpen, setIsAddActionDialogOpen] = useState(false);

  const [reload, setReload] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const searchParams = useSearchParams();
  const eventTypeId = searchParams?.get("eventTypeId");

  useEffect(() => {
    const matchingOption = allOptions.find((option) => option.value === eventTypeId);
    if (matchingOption && !selectedOptions.find((option) => option.value === eventTypeId)) {
      const newOptions = [...selectedOptions, matchingOption];
      setSelectedOptions(newOptions);
      form.setValue("activeOn", newOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTypeId]);

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
          {isOrg ? (
            <div className="flex">
              <Label>{t("which_team_apply")}</Label>
              <div className="-mt-0.5">
                <InfoBadge content={t("team_select_info")} />
              </div>
            </div>
          ) : (
            <Label>{t("which_event_type_apply")}</Label>
          )}
          <Controller
            name="activeOn"
            control={form.control}
            render={() => {
              return (
                <MultiSelectCheckboxes
                  options={allOptions}
                  isDisabled={props.readOnly || form.getValues("selectAll")}
                  className="w-full md:w-64"
                  setSelected={setSelectedOptions}
                  selected={form.getValues("selectAll") ? allOptions : selectedOptions}
                  setValue={(s: Option[]) => {
                    form.setValue("activeOn", s);
                  }}
                  countText={isOrg ? "count_team" : "nr_event_type"}
                />
              );
            }}
          />
          <div className="mt-3">
            <Controller
              name="selectAll"
              render={({ field: { value, onChange } }) => (
                <CheckboxField
                  description={isOrg ? t("apply_to_all_teams") : t("apply_to_all_event_types")}
                  disabled={props.readOnly}
                  onChange={(e) => {
                    onChange(e);
                    if (e.target.value) {
                      setSelectedOptions(allOptions);
                      form.setValue("activeOn", allOptions);
                    }
                  }}
                  checked={value}
                />
              )}
            />
          </div>
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
