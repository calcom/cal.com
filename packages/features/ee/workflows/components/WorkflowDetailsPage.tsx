import { useRouter, useSearchParams } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useState, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";

import { SENDER_ID, SENDER_NAME, SCANNING_WORKFLOW_STEPS } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { WorkflowActions } from "@calcom/prisma/enums";
import { WorkflowTemplates } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { FormCard, FormCardBody } from "@calcom/ui/components/card";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import { isSMSAction } from "../lib/actionHelperFunctions";
import type { FormValues } from "../pages/workflow";
import { AddActionDialog } from "./AddActionDialog";
import WorkflowStepContainer from "./WorkflowStepContainer";

type User = RouterOutputs["viewer"]["me"]["get"];

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
      template: WorkflowTemplates.REMINDER,
      numberRequired: numberRequired || false,
      sender: isSMSAction(action) ? sender || SENDER_ID : SENDER_ID,
      senderName: !isSMSAction(action) ? senderName || SENDER_NAME : SENDER_NAME,
      numberVerificationPending: false,
      includeCalendarEvent: false,
      verifiedAt: SCANNING_WORKFLOW_STEPS ? null : new Date(),
    };
    steps?.push(step);
    form.setValue("steps", steps);
  };

  return (
    <>
      <div className="space-y-6">
        <FormCard label={`1. ${t("trigger")}`}>
          <FormCardBody>
            <WorkflowStepContainer
              form={form}
              user={props.user}
              teamId={teamId}
              readOnly={props.readOnly}
              selectedOptions={selectedOptions}
              setSelectedOptions={setSelectedOptions}
              isOrg={isOrg}
              allOptions={allOptions}
            />
          </FormCardBody>
        </FormCard>

        <div className="flex justify-center">
          <Icon name="arrow-down" className="text-subtle stroke-[1.5px] text-3xl" />
        </div>
        {form.getValues("steps") && (
          <div className="space-y-4">
            {form.getValues("steps")?.map((step, index) => {
              return (
                <FormCard
                  key={step.id}
                  label={`${index + 2}. ${t("action")} ${index + 1}`}
                  deleteField={
                    !props.readOnly && (form.getValues("steps")?.length || 0) > 1
                      ? {
                          check: () => true,
                          fn: () => {
                            const steps = form.getValues("steps");
                            const updatedSteps = steps
                              ?.filter((currStep) => currStep.id !== step.id)
                              .map((s) => {
                                const updatedStep = s;
                                if (step.stepNumber < updatedStep.stepNumber) {
                                  updatedStep.stepNumber = updatedStep.stepNumber - 1;
                                }
                                return updatedStep;
                              });
                            form.setValue("steps", updatedSteps);
                            if (setReload) {
                              setReload(!reload);
                            }
                          },
                        }
                      : null
                  }>
                  <FormCardBody>
                    <WorkflowStepContainer
                      form={form}
                      user={props.user}
                      step={step}
                      reload={reload}
                      setReload={setReload}
                      teamId={teamId}
                      readOnly={props.readOnly}
                    />
                  </FormCardBody>
                </FormCard>
              );
            })}
          </div>
        )}
        <div className="flex justify-center">
          <Icon name="arrow-down" className="text-subtle stroke-[1.5px] text-3xl" />
        </div>
        {!props.readOnly && (
          <FormCard label={t("add_action")}>
            <FormCardBody>
              <div className="flex flex-col items-center gap-4">
                <Button
                  type="button"
                  onClick={() => setIsAddActionDialogOpen(true)}
                  color="secondary"
                  className="bg-default">
                  {t("add_action")}
                </Button>
              </div>
            </FormCardBody>
          </FormCard>
        )}
      </div>

      <AddActionDialog
        isOpenDialog={isAddActionDialogOpen}
        setIsOpenDialog={setIsAddActionDialogOpen}
        addAction={addAction}
      />
    </>
  );
}
