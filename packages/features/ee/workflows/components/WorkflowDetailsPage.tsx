import { useSearchParams } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useState, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";

import { useHasActiveTeamPlan } from "@calcom/features/billing/hooks/useHasPaidPlan";
import type { WorkflowPermissions } from "@calcom/features/workflows/repositories/WorkflowPermissionsRepository";
import { SENDER_ID, SENDER_NAME, SCANNING_WORKFLOW_STEPS } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";
import { WorkflowTemplates } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { FormCard, FormCardBody } from "@calcom/ui/components/card";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import { useAgentsData } from "../hooks/useAgentsData";
import { isCalAIAction, isFormTrigger, isSMSAction } from "../lib/actionHelperFunctions";
import { ALLOWED_FORM_WORKFLOW_ACTIONS } from "../lib/constants";
import emailReminderTemplate from "../lib/reminders/templates/emailReminderTemplate";
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
  isOrg: boolean;
  allOptions: Option[];
  onSaveWorkflow?: () => Promise<void>;
  permissions: WorkflowPermissions;
}

export default function WorkflowDetailsPage(props: Props) {
  const { form, workflowId, selectedOptions, setSelectedOptions, teamId, isOrg, allOptions, permissions } =
    props;
  const { t, i18n } = useLocale();
  const { hasActiveTeamPlan } = useHasActiveTeamPlan();

  const [isAddActionDialogOpen, setIsAddActionDialogOpen] = useState(false);
  const [isDeleteStepDialogOpen, setIsDeleteStepDialogOpen] = useState(false);

  const [reload, setReload] = useState(false);
  const [updateTemplate, setUpdateTemplate] = useState(false);

  const searchParams = useSearchParams();
  const eventTypeId = searchParams?.get("eventTypeId");

  // Get base action options and transform them for form triggers
  const { data: baseActionOptions } = trpc.viewer.workflows.getWorkflowActionOptions.useQuery();

  const transformedActionOptions = baseActionOptions
    ? baseActionOptions
        .filter((option) => {
          const isFormWorkflowWithInvalidSteps =
            isFormTrigger(form.getValues("trigger")) &&
            !ALLOWED_FORM_WORKFLOW_ACTIONS.some((action) => action === option.value);

          const isSelectAllCalAiAction = isCalAIAction(option.value) && form.watch("selectAll");

          const isOrgCalAiAction = isCalAIAction(option.value) && isOrg;

          if (isFormWorkflowWithInvalidSteps || isSelectAllCalAiAction || isOrgCalAiAction) {
            return false;
          }
          return true;
        })
        .map((option) => {
          let label = option.label;

          // Transform labels for form triggers
          if (isFormTrigger(form.getValues("trigger"))) {
            if (option.value === WorkflowActions.EMAIL_ATTENDEE) {
              label = t("email_attendee_action_form");
            } else if (option.value === WorkflowActions.SMS_ATTENDEE) {
              label = t("sms_attendee_action_form");
            }
          }

          const needsTeamsUpgrade = isFormTrigger(form.getValues("trigger")) && !hasActiveTeamPlan;

          return {
            ...option,
            label,
            creditsTeamId: teamId,
            isOrganization: isOrg,
            isCalAi: isCalAIAction(option.value),
            needsTeamsUpgrade,
          };
        })
    : [];

  useEffect(() => {
    const matchingOption = allOptions.find((option) => option.value === eventTypeId);
    if (matchingOption && !selectedOptions.find((option) => option.value === eventTypeId)) {
      const newOptions = [...selectedOptions, matchingOption];
      setSelectedOptions(newOptions);
      form.setValue("activeOn", newOptions);
    }
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

    const timeFormat = getTimeFormatStringFromUserTimeFormat(props.user.timeFormat);

    const template = isFormTrigger(form.getValues("trigger"))
      ? WorkflowTemplates.CUSTOM
      : WorkflowTemplates.REMINDER;

    const { emailBody: reminderBody, emailSubject } =
      template !== WorkflowTemplates.CUSTOM
        ? emailReminderTemplate({
            isEditingMode: true,
            locale: i18n.language,
            t,
            action,
            timeFormat,
          })
        : { emailBody: null, emailSubject: null };

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
      reminderBody,
      emailSubject,
      template,
      numberRequired: numberRequired || false,
      sender: isSMSAction(action) ? sender || SENDER_ID : SENDER_ID,
      senderName: !isSMSAction(action) ? senderName || SENDER_NAME : SENDER_NAME,
      numberVerificationPending: false,
      includeCalendarEvent: false,
      verifiedAt: SCANNING_WORKFLOW_STEPS ? null : new Date(),
      agentId: null,
      inboundAgentId: null,
    };
    steps?.push(step);
    form.setValue("steps", steps);
  };

  const { outboundAgentQueries: agentQueriesTrpc, inboundAgentQueries: inboundAgentQueriesTrpc } =
    useAgentsData(form);

  return (
    <>
      <div>
        <FormCard
          className="mb-0 border-muted"
          collapsible={false}
          label={
            <div className="flex gap-2 items-center pt-1 pb-2">
              <div className="p-1 ml-1 rounded-lg border border-subtle text-subtle">
                <Icon name="zap" size="16" />
              </div>
              <div className="text-sm font-medium leading-none">{t("trigger")}</div>
            </div>
          }>
          <FormCardBody className="border-muted">
            <WorkflowStepContainer
              form={form}
              user={props.user}
              teamId={teamId}
              readOnly={permissions.readOnly}
              selectedOptions={selectedOptions}
              setSelectedOptions={setSelectedOptions}
              isOrganization={isOrg}
              allOptions={allOptions}
              onSaveWorkflow={props.onSaveWorkflow}
              actionOptions={transformedActionOptions}
              updateTemplate={updateTemplate}
              setUpdateTemplate={setUpdateTemplate}
            />
          </FormCardBody>
        </FormCard>

        <div className="!mt-0 ml-7 h-3 w-2 border-l" />
        {form.getValues("steps") && (
          <div className="">
            {form.getValues("steps")?.map((step, index) => {
              const agentData = agentQueriesTrpc[index]?.data;
              const isAgentLoading = agentQueriesTrpc[index]?.isPending;
              const inboundAgentData = inboundAgentQueriesTrpc[index]?.data;
              const isInboundAgentLoading = inboundAgentQueriesTrpc[index]?.isPending;

              return (
                <div key={index}>
                  <FormCard
                    key={step.id}
                    className="mb-0 bg-muted border-muted"
                    collapsible={false}
                    label={
                      <div className="flex gap-2 items-center pt-1 pb-2">
                        <div className="p-1 rounded-lg border border-subtle text-subtle">
                          <Icon name="arrow-right" size="16" />
                        </div>
                        <div className="text-sm font-medium leading-none">{t("action")}</div>
                      </div>
                    }
                    deleteField={
                      !permissions.readOnly
                        ? {
                            color: "destructive",
                            check: () => true,
                            disabled: !permissions.canUpdate,
                            fn: () => {
                              if (
                                isCalAIAction(step.action) &&
                                agentData?.outboundPhoneNumbers &&
                                agentData.outboundPhoneNumbers.length > 0
                              ) {
                                setIsDeleteStepDialogOpen(true);
                              } else {
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
                              }
                            },
                          }
                        : null
                    }>
                    <FormCardBody className="border-muted">
                      <WorkflowStepContainer
                        form={form}
                        user={props.user}
                        step={step}
                        reload={reload}
                        setReload={setReload}
                        teamId={teamId}
                        readOnly={permissions.readOnly}
                        onSaveWorkflow={props.onSaveWorkflow}
                        setIsDeleteStepDialogOpen={setIsDeleteStepDialogOpen}
                        isDeleteStepDialogOpen={isDeleteStepDialogOpen}
                        isAgentLoading={isAgentLoading}
                        agentData={agentData}
                        inboundAgentData={inboundAgentData}
                        isInboundAgentLoading={isInboundAgentLoading}
                        allOptions={allOptions}
                        actionOptions={transformedActionOptions}
                        updateTemplate={updateTemplate}
                        setUpdateTemplate={setUpdateTemplate}
                      />
                    </FormCardBody>
                  </FormCard>
                  {index !== form.getValues("steps").length - 1 && (
                    <div className="border-default !mt-0 ml-7 h-3 w-2 border-l" />
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!permissions.readOnly && (
          <>
            <div className="border-default !mt-0 ml-7 h-3 w-2 border-l" />
            <Button
              type="button"
              onClick={() => setIsAddActionDialogOpen(true)}
              color="secondary"
              className="bg-default">
              {t("add_action")}
            </Button>
          </>
        )}
      </div>

      <AddActionDialog
        isOpenDialog={isAddActionDialogOpen}
        setIsOpenDialog={setIsAddActionDialogOpen}
        addAction={addAction}
        actionOptions={transformedActionOptions}
      />
    </>
  );
}
