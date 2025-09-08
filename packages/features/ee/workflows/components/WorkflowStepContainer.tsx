import type { WorkflowStep } from "@prisma/client";
import { type TFunction } from "i18next";
import { useParams } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import "react-phone-number-input/style.css";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import PhoneInput from "@calcom/features/components/phone-input";
import { SENDER_ID, SENDER_NAME } from "@calcom/lib/constants";
import { formatPhoneNumber } from "@calcom/lib/formatPhoneNumber";
import { useHasActiveTeamPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import {
  MembershipRole,
  PhoneNumberSubscriptionStatus,
  TimeUnit,
  WorkflowActions,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { AddVariablesDropdown } from "@calcom/ui/components/editor";
import { Editor } from "@calcom/ui/components/editor";
import { CheckboxField } from "@calcom/ui/components/form";
import { EmailField } from "@calcom/ui/components/form";
import { TextArea } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { Input } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import {
  isSMSAction,
  isWhatsappAction,
  getTemplateBodyForAction,
  shouldScheduleEmailReminder,
  isSMSOrWhatsappAction,
  isCalAIAction,
} from "../lib/actionHelperFunctions";
import { DYNAMIC_TEXT_VARIABLES } from "../lib/constants";
import { getWorkflowTemplateOptions, getWorkflowTriggerOptions } from "../lib/getOptions";
import emailRatingTemplate from "../lib/reminders/templates/emailRatingTemplate";
import emailReminderTemplate from "../lib/reminders/templates/emailReminderTemplate";
import type { FormValues } from "../pages/workflow";
import { AgentConfigurationSheet } from "./AgentConfigurationSheet";
import { TestAgentDialog } from "./TestAgentDialog";
import { TimeTimeUnitInput } from "./TimeTimeUnitInput";

type User = RouterOutputs["viewer"]["me"]["get"];

type WorkflowStepProps = {
  step?: WorkflowStep;
  form: UseFormReturn<FormValues>;
  user: User;
  reload?: boolean;
  setReload?: Dispatch<SetStateAction<boolean>>;
  teamId?: number;
  readOnly: boolean;
  isOrganization?: boolean;
  onSaveWorkflow?: () => Promise<void>;
};

const getTimeSectionText = (trigger: WorkflowTriggerEvents, t: TFunction) => {
  const triggerMap: Partial<Record<WorkflowTriggerEvents, string>> = {
    [WorkflowTriggerEvents.AFTER_EVENT]: "how_long_after",
    [WorkflowTriggerEvents.BEFORE_EVENT]: "how_long_before",
    [WorkflowTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW]: "how_long_after_hosts_no_show",
    [WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW]: "how_long_after_guests_no_show",
  };
  if (!triggerMap[trigger]) return null;
  return t(triggerMap[trigger]!);
};

const CalAIAgentDataSkeleton = () => {
  return (
    <div className="bg-muted mt-4 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <SkeletonText className="h-5 w-28" />
          <div className="mt-2 flex items-center gap-2">
            <SkeletonText className="h-4 w-4" />
            <SkeletonText className="h-4 w-32" />
            <SkeletonText className="h-5 w-12" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <SkeletonText className="h-8 w-24" />
          <SkeletonText className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
};

const getActivePhoneNumbers = (
  phoneNumbers?: Array<{ subscriptionStatus?: string; phoneNumber: string }>
) => {
  return (
    phoneNumbers?.filter(
      (phone) =>
        phone.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE || !phone.subscriptionStatus
    ) || []
  );
};

export default function WorkflowStepContainer(props: WorkflowStepProps) {
  const { t, i18n } = useLocale();
  const utils = trpc.useUtils();
  const params = useParams();

  const { step, form, reload, setReload, teamId } = props;
  const { data: _verifiedNumbers } = trpc.viewer.workflows.getVerifiedNumbers.useQuery(
    { teamId },
    { enabled: !!teamId }
  );

  const { data: userTeams } = trpc.viewer.teams.list.useQuery({}, { enabled: !teamId });
  const [agentConfigurationSheet, setAgentConfigurationSheet] = useState<{
    open: boolean;
    activeTab?: "prompt" | "phoneNumber";
  }>({
    open: false,
    activeTab: "prompt",
  });

  const creditsTeamId = userTeams?.find(
    (team) => team.accepted && (team.role === MembershipRole.ADMIN || team.role === MembershipRole.OWNER)
  )?.id;

  const { hasActiveTeamPlan } = useHasActiveTeamPlan();

  const { data: _verifiedEmails } = trpc.viewer.workflows.getVerifiedEmails.useQuery({ teamId });

  const timeFormat = getTimeFormatStringFromUserTimeFormat(props.user.timeFormat);

  const createAgentMutation = trpc.viewer.aiVoiceAgent.create.useMutation({
    onSuccess: async (data) => {
      showToast(t("agent_created_successfully"), "success");

      // Update the step's agentId in the form state
      if (step) {
        const stepIndex = step.stepNumber - 1;
        form.setValue(`steps.${stepIndex}.agentId`, data.id);

        await utils.viewer.aiVoiceAgent.get.invalidate({ id: data.id });
      }
      setAgentConfigurationSheet((prev) => ({ ...prev, open: true }));
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const stepAgentId = step?.agentId || form.watch(`steps.${step ? step.stepNumber - 1 : 0}.agentId`) || null;

  const { data: agentData, isPending: isAgentLoading } = trpc.viewer.aiVoiceAgent.get.useQuery(
    { id: stepAgentId || "" },
    { enabled: !!stepAgentId }
  );

  const updateAgentMutation = trpc.viewer.aiVoiceAgent.update.useMutation({
    onSuccess: async () => {
      showToast(t("agent_updated_successfully"), "success");
      if (stepAgentId) {
        utils.viewer.aiVoiceAgent.get.invalidate({ id: stepAgentId });
      }
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const unsubscribePhoneNumberMutation = trpc.viewer.phoneNumber.update.useMutation({
    onSuccess: async () => {
      showToast(t("phone_number_unsubscribed_successfully"), "success");
      setIsUnsubscribeDialogOpen(false);
      if (stepAgentId) {
        utils.viewer.aiVoiceAgent.get.invalidate({ id: stepAgentId });
      }
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const verifiedNumbers = _verifiedNumbers?.map((number) => number.phoneNumber) || [];
  const verifiedEmails = _verifiedEmails || [];
  const [isAdditionalInputsDialogOpen, setIsAdditionalInputsDialogOpen] = useState(false);
  const [isTestAgentDialogOpen, setIsTestAgentDialogOpen] = useState(false);
  const [isUnsubscribeDialogOpen, setIsUnsubscribeDialogOpen] = useState(false);
  const [isDeleteStepDialogOpen, setIsDeleteStepDialogOpen] = useState(false);

  const [verificationCode, setVerificationCode] = useState("");

  const action = step?.action;
  const requirePhoneNumber =
    WorkflowActions.SMS_NUMBER === action || WorkflowActions.WHATSAPP_NUMBER === action;
  const [isPhoneNumberNeeded, setIsPhoneNumberNeeded] = useState(requirePhoneNumber);

  const [updateTemplate, setUpdateTemplate] = useState(false);
  const [firstRender, setFirstRender] = useState(true);

  const senderNeeded =
    step?.action === WorkflowActions.SMS_NUMBER || step?.action === WorkflowActions.SMS_ATTENDEE;

  const [isSenderIsNeeded, setIsSenderIsNeeded] = useState(senderNeeded);

  const [isEmailAddressNeeded, setIsEmailAddressNeeded] = useState(
    step?.action === WorkflowActions.EMAIL_ADDRESS ? true : false
  );

  const [isEmailSubjectNeeded, setIsEmailSubjectNeeded] = useState(
    step?.action === WorkflowActions.EMAIL_ATTENDEE ||
      step?.action === WorkflowActions.EMAIL_HOST ||
      step?.action === WorkflowActions.EMAIL_ADDRESS
      ? true
      : false
  );

  const [timeSectionText, setTimeSectionText] = useState(getTimeSectionText(form.getValues("trigger"), t));

  const { data: actionOptions } = trpc.viewer.workflows.getWorkflowActionOptions.useQuery();
  const triggerOptions = getWorkflowTriggerOptions(t);
  const templateOptions = getWorkflowTemplateOptions(t, step?.action, hasActiveTeamPlan);
  if (step && !form.getValues(`steps.${step.stepNumber - 1}.reminderBody`)) {
    const action = form.getValues(`steps.${step.stepNumber - 1}.action`);

    // Skip setting reminderBody for CAL_AI actions since they don't need email templates
    if (!isCalAIAction(action)) {
      const template = getTemplateBodyForAction({
        action,
        locale: i18n.language,
        t,
        template: step.template ?? WorkflowTemplates.REMINDER,
        timeFormat,
      });
      form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, template);
    }
  }

  if (step && !form.getValues(`steps.${step.stepNumber - 1}.emailSubject`)) {
    const action = form.getValues(`steps.${step.stepNumber - 1}.action`);
    // Skip setting emailSubject for CAL_AI actions since they don't need email subjects
    if (!isCalAIAction(action)) {
      const subjectTemplate = emailReminderTemplate({
        isEditingMode: true,
        locale: i18n.language,
        t,
        action: action,
        timeFormat,
      }).emailSubject;
      form.setValue(`steps.${step.stepNumber - 1}.emailSubject`, subjectTemplate);
    }
  }

  const { ref: emailSubjectFormRef, ...restEmailSubjectForm } = step
    ? form.register(`steps.${step.stepNumber - 1}.emailSubject`)
    : { ref: null, name: "" };

  const refEmailSubject = useRef<HTMLTextAreaElement | null>(null);

  const getNumberVerificationStatus = () =>
    !!step &&
    !!verifiedNumbers.find(
      (number: string) => number === form.getValues(`steps.${step.stepNumber - 1}.sendTo`)
    );

  const getEmailVerificationStatus = () =>
    !!step &&
    !!verifiedEmails.find((email: string) => email === form.getValues(`steps.${step.stepNumber - 1}.sendTo`));

  const [numberVerified, setNumberVerified] = useState(getNumberVerificationStatus());
  const [emailVerified, setEmailVerified] = useState(getEmailVerificationStatus());

  useEffect(() => setNumberVerified(getNumberVerificationStatus()), [verifiedNumbers.length]);
  useEffect(() => setEmailVerified(getEmailVerificationStatus()), [verifiedEmails.length]);

  const addVariableEmailSubject = (variable: string) => {
    if (step) {
      const currentEmailSubject = refEmailSubject?.current?.value || "";
      const cursorPosition = refEmailSubject?.current?.selectionStart || currentEmailSubject.length;
      const subjectWithAddedVariable = `${currentEmailSubject.substring(0, cursorPosition)}{${variable
        .toUpperCase()
        .replace(/ /g, "_")}}${currentEmailSubject.substring(cursorPosition)}`;
      form.setValue(`steps.${step.stepNumber - 1}.emailSubject`, subjectWithAddedVariable);
    }
  };

  const sendVerificationCodeMutation = trpc.viewer.workflows.sendVerificationCode.useMutation({
    onSuccess: async () => {
      showToast(t("verification_code_sent"), "success");
    },
    onError: async (error) => {
      showToast(error.message, "error");
    },
  });

  const verifyPhoneNumberMutation = trpc.viewer.workflows.verifyPhoneNumber.useMutation({
    onSuccess: async (isVerified) => {
      showToast(isVerified ? t("verified_successfully") : t("wrong_code"), "success");
      setNumberVerified(isVerified);
      if (
        step &&
        form?.formState?.errors?.steps &&
        form.formState.errors.steps[step.stepNumber - 1]?.sendTo &&
        isVerified
      ) {
        form.clearErrors(`steps.${step.stepNumber - 1}.sendTo`);
      }

      utils.viewer.workflows.getVerifiedNumbers.invalidate();
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
        setNumberVerified(false);
      }
    },
  });

  const sendEmailVerificationCodeMutation = trpc.viewer.auth.sendVerifyEmailCode.useMutation({
    onSuccess() {
      showToast(t("email_sent"), "success");
    },
    onError: () => {
      showToast(t("email_not_sent"), "error");
    },
  });

  const verifyEmailCodeMutation = trpc.viewer.workflows.verifyEmailCode.useMutation({
    onSuccess: (isVerified) => {
      showToast(isVerified ? t("verified_successfully") : t("wrong_code"), "success");
      setEmailVerified(true);
      if (
        step &&
        form?.formState?.errors?.steps &&
        form.formState.errors.steps[step.stepNumber - 1]?.sendTo &&
        isVerified
      ) {
        form.clearErrors(`steps.${step.stepNumber - 1}.sendTo`);
      }
      utils.viewer.workflows.getVerifiedEmails.invalidate();
    },
    onError: (err) => {
      if (err.message === "invalid_code") {
        showToast(t("code_provided_invalid"), "error");
        setEmailVerified(false);
      }
    },
  });
  /* const testActionMutation = trpc.viewer.workflows.testAction.useMutation({
    onSuccess: async () => {
      showToast(t("notification_sent"), "success");
    },
    onError: (err) => {
      let message = t("unexpected_error_try_again");
      if (err instanceof TRPCClientError) {
        if (err.message === "rate-limit-exceeded") {
          message = t("rate_limit_exceeded");
        } else {
          message = err.message;
        }
      }
      if (err instanceof HttpError) {
        message = `${err.statusCode}: ${err.message}`;
      }
      showToast(message, "error");
    },
  }); */

  //trigger
  if (!step) {
    const trigger = form.getValues("trigger");
    const triggerString = t(`${trigger.toLowerCase()}_trigger`);

    const selectedTrigger = {
      label: triggerString.charAt(0).toUpperCase() + triggerString.slice(1),
      value: trigger,
    };

    return (
      <>
        <div className="flex justify-center">
          <div className="min-w-80 bg-default border-subtle w-full rounded-md border p-7">
            <div className="flex">
              <div className="bg-subtle text-default mt-[3px] flex h-5 w-5 items-center justify-center rounded-full p-1 text-xs font-medium ltr:mr-5 rtl:ml-5">
                1
              </div>
              <div>
                <div className="text-emphasis text-base font-bold">{t("trigger")}</div>
                <div className="text-default text-sm">{t("when_something_happens")}</div>
              </div>
            </div>
            <div className="border-subtle my-7 border-t" />
            <Label>{t("when")}</Label>
            <Controller
              name="trigger"
              control={form.control}
              render={() => {
                return (
                  <Select
                    isSearchable={false}
                    className="text-sm"
                    id="trigger-select"
                    isDisabled={props.readOnly}
                    onChange={(val) => {
                      if (val) {
                        form.setValue("trigger", val.value);
                        const newTimeSectionText = getTimeSectionText(val.value, t);
                        if (newTimeSectionText) {
                          setTimeSectionText(newTimeSectionText);
                          if (
                            val.value === WorkflowTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW ||
                            val.value === WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
                          ) {
                            form.setValue("time", 5);
                            form.setValue("timeUnit", TimeUnit.MINUTE);
                          } else {
                            form.setValue("time", 24);
                            form.setValue("timeUnit", TimeUnit.HOUR);
                          }
                        } else {
                          setTimeSectionText(null);
                          form.unregister("time");
                          form.unregister("timeUnit");
                        }
                      }
                    }}
                    defaultValue={selectedTrigger}
                    options={triggerOptions}
                  />
                );
              }}
            />
            {!!timeSectionText && (
              <div className="mt-5">
                <Label>{timeSectionText}</Label>
                <TimeTimeUnitInput disabled={props.readOnly} />
                {!props.readOnly && (
                  <div className="mt-1 flex text-gray-500">
                    <Icon name="info" className="mr-1 mt-0.5 h-4 w-4" />
                    <p className="text-sm">{t("testing_workflow_info_message")}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  if (step && step.action) {
    const actionString = t(`${step.action.toLowerCase()}_action`);

    const selectedAction = {
      label: actionString.charAt(0).toUpperCase() + actionString.slice(1),
      value: step.action,
      needsCredits: isSMSOrWhatsappAction(step.action),
      creditsTeamId: teamId ?? creditsTeamId,
      isOrganization: props.isOrganization,
    };

    const selectedTemplate = {
      label: t(`${step.template.toLowerCase()}`),
      value: step.template,
      needsTeamsUpgrade: false,
    };

    const canRequirePhoneNumber = (workflowStep: string) => {
      return (
        WorkflowActions.SMS_ATTENDEE === workflowStep || WorkflowActions.WHATSAPP_ATTENDEE === workflowStep
      );
    };

    const arePhoneNumbersActive = getActivePhoneNumbers(
      agentData?.outboundPhoneNumbers?.map((phone) => ({
        ...phone,
        subscriptionStatus: phone.subscriptionStatus ?? undefined,
      }))
    );

    return (
      <>
        <div className="my-3 flex justify-center">
          <Icon name="arrow-down" className="text-subtle stroke-[1.5px] text-3xl" />
        </div>
        <div className="flex justify-center">
          <div className="min-w-80 bg-default border-subtle flex w-full rounded-md border p-7">
            <div className="w-full">
              <div className="flex">
                <div className="w-full">
                  <div className="flex">
                    <div className="bg-subtle text-default mt-[3px] flex h-5 w-5 items-center justify-center rounded-full p-1 text-xs ltr:mr-5 rtl:ml-5">
                      {step.stepNumber + 1}
                    </div>
                    <div>
                      <div className="text-emphasis text-base font-bold">{t("action")}</div>
                      <div className="text-default text-sm">{t("action_is_performed")}</div>
                    </div>
                  </div>
                </div>
                {!props.readOnly && (
                  <div>
                    <Dropdown>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" color="minimal" variant="icon" StartIcon="ellipsis" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <DropdownItem
                            type="button"
                            StartIcon="trash-2"
                            color="destructive"
                            onClick={() => {
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
                            }}>
                            {t("delete")}
                          </DropdownItem>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </Dropdown>
                  </div>
                )}
              </div>
              <div className="border-subtle my-7 border-t" />
              <div>
                <Label>{t("do_this")}</Label>
                <Controller
                  name={`steps.${step.stepNumber - 1}.action`}
                  control={form.control}
                  render={() => {
                    return (
                      <Select
                        isSearchable={false}
                        className="text-sm"
                        isDisabled={props.readOnly}
                        onChange={(val) => {
                          if (val) {
                            const oldValue = form.getValues(`steps.${step.stepNumber - 1}.action`);

                            const template = getTemplateBodyForAction({
                              action: val.value,
                              locale: i18n.language,
                              t,
                              template: WorkflowTemplates.REMINDER,
                              timeFormat,
                            });

                            form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, template);

                            const setNumberRequiredConfigs = (
                              phoneNumberIsNeeded: boolean,
                              senderNeeded = true
                            ) => {
                              setIsSenderIsNeeded(senderNeeded);
                              setIsEmailAddressNeeded(false);
                              setIsPhoneNumberNeeded(phoneNumberIsNeeded);
                              setNumberVerified(getNumberVerificationStatus());
                            };

                            if (isSMSAction(val.value)) {
                              setNumberRequiredConfigs(val.value === WorkflowActions.SMS_NUMBER);
                              // email action changes to sms action
                              if (!isSMSAction(oldValue)) {
                                form.setValue(`steps.${step.stepNumber - 1}.sender`, SENDER_ID);
                              }

                              setIsEmailSubjectNeeded(false);
                              form.setValue(`steps.${step.stepNumber - 1}.agentId`, null);
                            } else if (isWhatsappAction(val.value)) {
                              setNumberRequiredConfigs(val.value === WorkflowActions.WHATSAPP_NUMBER, false);

                              if (!isWhatsappAction(oldValue)) {
                                form.setValue(`steps.${step.stepNumber - 1}.sender`, "");
                              }

                              setIsEmailSubjectNeeded(false);
                              form.setValue(`steps.${step.stepNumber - 1}.agentId`, null);
                            } else if (isCalAIAction(val.value)) {
                              setIsPhoneNumberNeeded(false);
                              setIsSenderIsNeeded(false);
                              setIsEmailAddressNeeded(false);
                              setIsEmailSubjectNeeded(false);
                              form.setValue(`steps.${step.stepNumber - 1}.emailSubject`, null);
                              form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, null);
                              form.setValue(`steps.${step.stepNumber - 1}.sender`, null);
                            } else {
                              setIsPhoneNumberNeeded(false);
                              setIsSenderIsNeeded(false);
                              setIsEmailAddressNeeded(val.value === WorkflowActions.EMAIL_ADDRESS);
                              setIsEmailSubjectNeeded(true);
                              form.setValue(`steps.${step.stepNumber - 1}.agentId`, null);
                            }

                            form.setValue(`steps.${step.stepNumber - 1}.sendTo`, null);
                            form.clearErrors(`steps.${step.stepNumber - 1}.sendTo`);
                            form.setValue(`steps.${step.stepNumber - 1}.action`, val.value);
                            setUpdateTemplate(!updateTemplate);
                          }
                        }}
                        defaultValue={selectedAction}
                        options={actionOptions
                          ?.filter((option) => {
                            if (
                              (isCalAIAction(option.value) && form.watch("selectAll")) ||
                              (isCalAIAction(option.value) && props.isOrganization)
                            ) {
                              return false;
                            }
                            return true;
                          })
                          ?.map((option) => ({
                            ...option,
                            creditsTeamId: teamId ?? creditsTeamId,
                            isOrganization: props.isOrganization,
                          }))}
                      />
                    );
                  }}
                />
              </div>
              {isCalAIAction(form.getValues(`steps.${step.stepNumber - 1}.action`)) && !stepAgentId && (
                <div className="bg-muted mt-2 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-emphasis text-sm font-medium leading-none">
                        {t("cal_ai_agent")}
                        <Badge startIcon="info" className="ms-2 rounded-md" variant="warning">
                          {t("set_up_required")}
                        </Badge>
                      </h2>
                      <p className="text-muted mt-2 text-sm font-medium leading-none">
                        {t("no_phone_number_connected")}.
                      </p>
                    </div>
                    <Button
                      color="secondary"
                      onClick={async () => {
                        // save the workflow first to get the step id
                        if (props.onSaveWorkflow) {
                          await props.onSaveWorkflow();

                          // After saving, get the updated step ID from the form
                          const updatedSteps = form.getValues("steps");
                          const currentStepIndex = step.stepNumber - 1;
                          const updatedStep = updatedSteps[currentStepIndex];

                          // Ensure the action is still set correctly after save
                          if (updatedStep.action !== WorkflowActions.CAL_AI_PHONE_CALL) {
                            form.setValue(
                              `steps.${currentStepIndex}.action`,
                              WorkflowActions.CAL_AI_PHONE_CALL
                            );
                          }

                          if (updatedStep && updatedStep.id) {
                            // Create agent with the workflow step ID
                            createAgentMutation.mutate({
                              teamId,
                              workflowStepId: updatedStep.id,
                            });
                          } else {
                            showToast(t("failed_to_get_workflow_step_id"), "error");
                          }
                        }
                      }}
                      loading={createAgentMutation.isPending}>
                      {t("set_up")}
                    </Button>
                  </div>
                </div>
              )}

              {stepAgentId && isAgentLoading && <CalAIAgentDataSkeleton />}
              {stepAgentId && agentData && (
                <div className="bg-muted mt-4 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-emphasis text-base font-medium">{t("cal_ai_agent")}</h3>
                      {arePhoneNumbersActive.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <Icon name="phone" className="text-emphasis h-4 w-4" />
                          <span className="text-emphasis text-sm">
                            {formatPhoneNumber(arePhoneNumbersActive[0].phoneNumber)}
                          </span>
                          <Badge variant="green" size="sm" withDot>
                            {t("active")}
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-subtle text-sm">{t("no_phone_number_connected")}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {arePhoneNumbersActive.length > 0 ? (
                        <Button
                          color="secondary"
                          onClick={() => setIsTestAgentDialogOpen(true)}
                          disabled={props.readOnly || !arePhoneNumbersActive.length}>
                          <Icon name="phone" className="mr-2 h-4 w-4" />
                          {t("test_agent")}
                        </Button>
                      ) : (
                        <Button
                          color="secondary"
                          onClick={() => {
                            setAgentConfigurationSheet((prev) => ({
                              ...prev,
                              open: true,
                              activeTab: "phoneNumber",
                            }));
                          }}
                          disabled={props.readOnly}>
                          {t("connect_phone_number")}
                        </Button>
                      )}
                      <Dropdown>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            color="secondary"
                            variant="icon"
                            StartIcon="ellipsis"
                            className="rounded-[10px]"
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <DropdownItem
                              type="button"
                              StartIcon="pencil"
                              onClick={() => setAgentConfigurationSheet({ open: true, activeTab: "prompt" })}>
                              {t("edit")}
                            </DropdownItem>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </Dropdown>
                    </div>
                  </div>
                </div>
              )}
              {isPhoneNumberNeeded && (
                <div className="bg-muted mt-2 rounded-md p-4 pt-0">
                  <Label className="pt-4">{t("custom_phone_number")}</Label>
                  <div className="block sm:flex">
                    <Controller
                      name={`steps.${step.stepNumber - 1}.sendTo`}
                      render={({ field: { value, onChange } }) => (
                        <PhoneInput
                          placeholder={t("phone_number")}
                          id={`steps.${step.stepNumber - 1}.sendTo`}
                          className="min-w-fit sm:rounded-r-none sm:rounded-bl-md sm:rounded-tl-md"
                          required
                          disabled={props.readOnly}
                          value={value}
                          onChange={(val) => {
                            const isAlreadyVerified = !!verifiedNumbers
                              ?.concat([])
                              .find((number) => number.replace(/\s/g, "") === val?.replace(/\s/g, ""));
                            setNumberVerified(isAlreadyVerified);
                            onChange(val);
                          }}
                        />
                      )}
                    />
                    <Button
                      color="secondary"
                      disabled={numberVerified || props.readOnly || false}
                      className={classNames(
                        "-ml-[3px] h-[40px] min-w-fit sm:block sm:rounded-bl-none sm:rounded-tl-none",
                        numberVerified ? "hidden" : "mt-3 sm:mt-0"
                      )}
                      onClick={() =>
                        sendVerificationCodeMutation.mutate({
                          phoneNumber: form.getValues(`steps.${step.stepNumber - 1}.sendTo`) || "",
                        })
                      }>
                      {t("send_code")}
                    </Button>
                  </div>

                  {form.formState.errors.steps &&
                    form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo && (
                      <p className="mt-1 text-xs text-red-500">
                        {form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo?.message || ""}
                      </p>
                    )}
                  {numberVerified ? (
                    <div className="mt-1">
                      <Badge variant="green">{t("number_verified")}</Badge>
                    </div>
                  ) : (
                    !props.readOnly && (
                      <>
                        <div className="mt-3 flex">
                          <TextField
                            className="h-[36px] rounded-r-none border-r-transparent"
                            placeholder="Verification code"
                            disabled={props.readOnly}
                            value={verificationCode}
                            onChange={(e) => {
                              setVerificationCode(e.target.value);
                            }}
                            required
                          />
                          <Button
                            color="secondary"
                            className="-ml-[3px] h-[36px] min-w-fit py-0 sm:block sm:rounded-bl-none sm:rounded-tl-none "
                            disabled={verifyPhoneNumberMutation.isPending || props.readOnly}
                            onClick={() => {
                              verifyPhoneNumberMutation.mutate({
                                phoneNumber: form.getValues(`steps.${step.stepNumber - 1}.sendTo`) || "",
                                code: verificationCode,
                                teamId,
                              });
                            }}>
                            {t("verify")}
                          </Button>
                        </div>
                        {form.formState.errors.steps &&
                          form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo && (
                            <p className="mt-1 text-xs text-red-500">
                              {form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo?.message || ""}
                            </p>
                          )}
                      </>
                    )
                  )}
                </div>
              )}
              {!isWhatsappAction(form.getValues(`steps.${step.stepNumber - 1}.action`)) &&
                !isCalAIAction(form.getValues(`steps.${step.stepNumber - 1}.action`)) && (
                  <div className="bg-muted mt-2 rounded-md p-4 pt-0">
                    {isSenderIsNeeded ? (
                      <>
                        <div className="pt-4">
                          <div className="flex items-center">
                            <Label>{t("sender_id")}</Label>
                            <Tooltip content={t("sender_id_info")}>
                              <span>
                                <Icon name="info" className="mb-2 ml-2 mr-1 mt-0.5 h-4 w-4 text-gray-500" />
                              </span>
                            </Tooltip>
                          </div>
                          <Input
                            type="text"
                            placeholder={SENDER_ID}
                            disabled={props.readOnly}
                            maxLength={11}
                            {...form.register(`steps.${step.stepNumber - 1}.sender`)}
                          />
                        </div>
                        {form.formState.errors.steps &&
                          form.formState?.errors?.steps[step.stepNumber - 1]?.sender && (
                            <p className="mt-1 text-xs text-red-500">{t("sender_id_error_message")}</p>
                          )}
                      </>
                    ) : (
                      <>
                        <div className="pt-4">
                          <Label>{t("sender_name")}</Label>
                          <Input
                            type="text"
                            disabled={props.readOnly}
                            placeholder={SENDER_NAME}
                            {...form.register(`steps.${step.stepNumber - 1}.senderName`)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              {canRequirePhoneNumber(form.getValues(`steps.${step.stepNumber - 1}.action`)) &&
                !isCalAIAction(form.getValues(`steps.${step.stepNumber - 1}.action`)) && (
                  <div className="mt-2">
                    <Controller
                      name={`steps.${step.stepNumber - 1}.numberRequired`}
                      control={form.control}
                      render={() => (
                        <CheckboxField
                          disabled={props.readOnly}
                          defaultChecked={
                            form.getValues(`steps.${step.stepNumber - 1}.numberRequired`) || false
                          }
                          description={t("make_phone_number_required")}
                          onChange={(e) =>
                            form.setValue(`steps.${step.stepNumber - 1}.numberRequired`, e.target.checked)
                          }
                        />
                      )}
                    />
                  </div>
                )}
              {isEmailAddressNeeded &&
                !isCalAIAction(form.getValues(`steps.${step.stepNumber - 1}.action`)) && (
                  <div className="bg-muted mt-5 rounded-md p-4">
                    <Label>{t("email_address")}</Label>
                    <div className="block sm:flex">
                      <Controller
                        name={`steps.${step.stepNumber - 1}.sendTo`}
                        render={({ field: { value, onChange } }) => (
                          <EmailField
                            required
                            containerClassName="w-full"
                            className="h-10 min-w-fit sm:rounded-r-none sm:rounded-bl-md sm:rounded-tl-md"
                            placeholder={t("email_address")}
                            value={value}
                            disabled={props.readOnly}
                            onChange={(val) => {
                              const isAlreadyVerified = !!verifiedEmails
                                ?.concat([])
                                .find((email) => email === val.target.value);
                              setEmailVerified(isAlreadyVerified);
                              onChange(val);
                            }}
                          />
                        )}
                      />
                      <Button
                        color="secondary"
                        disabled={emailVerified || props.readOnly || false}
                        className={classNames(
                          "-ml-[3px] h-[40px] min-w-fit sm:block sm:rounded-bl-none sm:rounded-tl-none",
                          emailVerified ? "hidden" : "mt-3 sm:mt-0"
                        )}
                        onClick={() => {
                          const email = form.getValues(`steps.${step.stepNumber - 1}.sendTo`) || "";
                          sendEmailVerificationCodeMutation.mutate({
                            email,
                            isVerifyingEmail: true,
                          });
                        }}>
                        {t("send_code")}
                      </Button>
                    </div>

                    {form.formState.errors.steps &&
                      form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo && (
                        <p className="mt-1 text-xs text-red-500">
                          {form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo?.message || ""}
                        </p>
                      )}

                    {emailVerified ? (
                      <div className="mt-1">
                        <Badge variant="green">{t("email_verified")}</Badge>
                      </div>
                    ) : (
                      !props.readOnly && (
                        <>
                          <div className="mt-3 flex">
                            <TextField
                              className="h-[36px] rounded-r-none border-r-transparent"
                              placeholder="Verification code"
                              disabled={props.readOnly}
                              value={verificationCode}
                              onChange={(e) => {
                                setVerificationCode(e.target.value);
                              }}
                              required
                            />
                            <Button
                              color="secondary"
                              className="-ml-[3px] h-[36px] min-w-fit py-0 sm:block sm:rounded-bl-none sm:rounded-tl-none "
                              disabled={verifyEmailCodeMutation.isPending || props.readOnly}
                              onClick={() => {
                                verifyEmailCodeMutation.mutate({
                                  code: verificationCode,
                                  email: form.getValues(`steps.${step.stepNumber - 1}.sendTo`) || "",
                                  teamId,
                                });
                              }}>
                              {t("verify")}
                            </Button>
                          </div>
                          {form.formState.errors.steps &&
                            form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo && (
                              <p className="mt-1 text-xs text-red-500">
                                {form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo?.message || ""}
                              </p>
                            )}
                        </>
                      )
                    )}
                  </div>
                )}
              {!isCalAIAction(form.getValues(`steps.${step.stepNumber - 1}.action`)) && (
                <div className="mt-5">
                  <Label>{t("message_template")}</Label>
                  <Controller
                    name={`steps.${step.stepNumber - 1}.template`}
                    control={form.control}
                    render={({ field }) => {
                      return (
                        <Select
                          isSearchable={false}
                          className="text-sm"
                          isDisabled={props.readOnly}
                          onChange={(val) => {
                            if (val) {
                              const action = form.getValues(`steps.${step.stepNumber - 1}.action`);

                              const template = getTemplateBodyForAction({
                                action,
                                locale: i18n.language,
                                t,
                                template: val.value ?? WorkflowTemplates.REMINDER,
                                timeFormat,
                              });

                              form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, template);

                              if (shouldScheduleEmailReminder(action)) {
                                if (val.value === WorkflowTemplates.REMINDER) {
                                  form.setValue(
                                    `steps.${step.stepNumber - 1}.emailSubject`,
                                    emailReminderTemplate({
                                      isEditingMode: true,
                                      locale: i18n.language,
                                      t,
                                      action,
                                      timeFormat,
                                    }).emailSubject
                                  );
                                } else if (val.value === WorkflowTemplates.RATING) {
                                  form.setValue(
                                    `steps.${step.stepNumber - 1}.emailSubject`,
                                    emailRatingTemplate({
                                      isEditingMode: true,
                                      locale: i18n.language,
                                      action,
                                      t,
                                      timeFormat,
                                    }).emailSubject
                                  );
                                }
                              }
                              field.onChange(val.value);
                              form.setValue(`steps.${step.stepNumber - 1}.template`, val.value);
                              setUpdateTemplate(!updateTemplate);
                            }
                          }}
                          defaultValue={selectedTemplate}
                          value={selectedTemplate}
                          options={templateOptions.map((option) => ({
                            label: option.label,
                            value: option.value,
                            needsTeamsUpgrade:
                              option.needsTeamsUpgrade &&
                              !isSMSAction(form.getValues(`steps.${step.stepNumber - 1}.action`)),
                          }))}
                          isOptionDisabled={(option: {
                            label: string;
                            value: any;
                            needsTeamsUpgrade: boolean;
                          }) => option.needsTeamsUpgrade}
                        />
                      );
                    }}
                  />
                </div>
              )}
              {!isCalAIAction(form.getValues(`steps.${step.stepNumber - 1}.action`)) && (
                <div className="bg-muted mt-2 rounded-md pt-2 md:p-6 md:pt-4">
                  {isEmailSubjectNeeded && (
                    <div className="mb-6">
                      <div className="flex items-center">
                        <Label className={classNames("flex-none", props.readOnly ? "mb-2" : "mb-0")}>
                          {t("email_subject")}
                        </Label>
                        {!props.readOnly && (
                          <div className="flex-grow text-right">
                            <AddVariablesDropdown
                              addVariable={addVariableEmailSubject}
                              variables={DYNAMIC_TEXT_VARIABLES}
                            />
                          </div>
                        )}
                      </div>
                      <TextArea
                        ref={(e) => {
                          emailSubjectFormRef?.(e);
                          refEmailSubject.current = e;
                        }}
                        rows={2}
                        disabled={props.readOnly || !hasActiveTeamPlan}
                        className="my-0 focus:ring-transparent"
                        required
                        {...restEmailSubjectForm}
                      />
                      {form.formState.errors.steps &&
                        form.formState?.errors?.steps[step.stepNumber - 1]?.emailSubject && (
                          <p className="mt-1 text-xs text-red-500">
                            {form.formState?.errors?.steps[step.stepNumber - 1]?.emailSubject?.message || ""}
                          </p>
                        )}
                    </div>
                  )}
                  <div className="mb-2 flex items-center pb-1">
                    <Label className="mb-0 flex-none">
                      {isEmailSubjectNeeded ? t("email_body") : t("text_message")}
                    </Label>
                  </div>
                  <Editor
                    getText={() => {
                      return props.form.getValues(`steps.${step.stepNumber - 1}.reminderBody`) || "";
                    }}
                    setText={(text: string) => {
                      props.form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, text);
                      props.form.clearErrors();
                    }}
                    variables={DYNAMIC_TEXT_VARIABLES}
                    addVariableButtonTop={isSMSAction(step.action)}
                    height="200px"
                    updateTemplate={updateTemplate}
                    firstRender={firstRender}
                    setFirstRender={setFirstRender}
                    editable={
                      !props.readOnly &&
                      !isWhatsappAction(step.action) &&
                      (hasActiveTeamPlan || isSMSAction(step.action))
                    }
                    excludedToolbarItems={
                      !isSMSAction(step.action) ? [] : ["blockType", "bold", "italic", "link"]
                    }
                    plainText={isSMSAction(step.action)}
                  />

                  {form.formState.errors.steps &&
                    form.formState?.errors?.steps[step.stepNumber - 1]?.reminderBody && (
                      <p className="mt-1 text-sm text-red-500">
                        {form.formState?.errors?.steps[step.stepNumber - 1]?.reminderBody?.message || ""}
                      </p>
                    )}
                  {isEmailSubjectNeeded && (
                    <div className="mt-2">
                      <Controller
                        name={`steps.${step.stepNumber - 1}.includeCalendarEvent`}
                        control={form.control}
                        render={() => (
                          <CheckboxField
                            disabled={props.readOnly}
                            defaultChecked={
                              form.getValues(`steps.${step.stepNumber - 1}.includeCalendarEvent`) || false
                            }
                            description={t("include_calendar_event")}
                            onChange={(e) =>
                              form.setValue(
                                `steps.${step.stepNumber - 1}.includeCalendarEvent`,
                                e.target.checked
                              )
                            }
                          />
                        )}
                      />
                    </div>
                  )}
                  {!props.readOnly && (
                    <div className="mt-3 ">
                      <button type="button" onClick={() => setIsAdditionalInputsDialogOpen(true)}>
                        <div className="text-default mt-2 flex text-sm">
                          <Icon name="circle-help" className="mt-[3px] h-3 w-3 ltr:mr-2 rtl:ml-2" />
                          <p className="text-left">{t("using_booking_questions_as_variables")}</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* {form.getValues(`steps.${step.stepNumber - 1}.action`) !== WorkflowActions.SMS_ATTENDEE && (
                <Button
                  type="button"
                  className="w-full mt-7"
                  onClick={() => {
                    let isEmpty = false;

                    if (!form.getValues(`steps.${step.stepNumber - 1}.sendTo`) && isPhoneNumberNeeded) {
                      form.setError(`steps.${step.stepNumber - 1}.sendTo`, {
                        type: "custom",
                        message: t("no_input"),
                      });
                      isEmpty = true;
                    }

                    if (!numberVerified && isPhoneNumberNeeded) {
                      form.setError(`steps.${step.stepNumber - 1}.sendTo`, {
                        type: "custom",
                        message: t("not_verified"),
                      });
                    }
                    if (
                      form.getValues(`steps.${step.stepNumber - 1}.template`) === WorkflowTemplates.CUSTOM
                    ) {
                      if (!form.getValues(`steps.${step.stepNumber - 1}.reminderBody`)) {
                        form.setError(`steps.${step.stepNumber - 1}.reminderBody`, {
                          type: "custom",
                          message: t("no_input"),
                        });
                        isEmpty = true;
                      } else if (
                        isEmailSubjectNeeded &&
                        !form.getValues(`steps.${step.stepNumber - 1}.emailSubject`)
                      ) {
                        form.setError(`steps.${step.stepNumber - 1}.emailSubject`, {
                          type: "custom",
                          message: t("no_input"),
                        });
                        isEmpty = true;
                      }
                    }

                    if (!isPhoneNumberNeeded && !isEmpty) {
                      //translate body and reminder to english
                      const emailSubject = translateVariablesToEnglish(
                        form.getValues(`steps.${step.stepNumber - 1}.emailSubject`) || "",
                        { locale: i18n.language, t }
                      );
                      const reminderBody = translateVariablesToEnglish(
                        form.getValues(`steps.${step.stepNumber - 1}.reminderBody`) || "",
                        { locale: i18n.language, t }
                      );

                      testActionMutation.mutate({
                        step,
                        emailSubject,
                        reminderBody,
                      });
                    } else {
                      const isNumberValid =
                        form.formState.errors.steps &&
                        form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo
                          ? false
                          : true;

                      if (isPhoneNumberNeeded && isNumberValid && !isEmpty && numberVerified) {
                        setConfirmationDialogOpen(true);
                      }
                    }
                  }}
                  color="secondary">
                  <div className="w-full">{t("test_action")}</div>
                </Button>
              )*/}
            </div>
          </div>
        </div>
        {/* <Dialog open={confirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
          <ConfirmationDialogContent
            variety="warning"
            title={t("test_workflow_action")}
            confirmBtnText={t("send_sms")}
            onConfirm={(e) => {
              e.preventDefault();
              const reminderBody = translateVariablesToEnglish(
                form.getValues(`steps.${step.stepNumber - 1}.reminderBody`) || "",
                { locale: i18n.language, t }
              );

              testActionMutation.mutate({
                step,
                emailSubject: "",
                reminderBody: reminderBody || "",
              });
              setConfirmationDialogOpen(false);
            }}>
            {t("send_sms_to_number", { number: form.getValues(`steps.${step.stepNumber - 1}.sendTo`) })}
          </ConfirmationDialogContent>
        </Dialog> */}
        <Dialog open={isAdditionalInputsDialogOpen} onOpenChange={setIsAdditionalInputsDialogOpen}>
          <DialogContent enableOverflow type="creation" className="sm:max-w-[610px]">
            <div>
              <h1 className="w-full text-xl font-semibold ">{t("how_booking_questions_as_variables")}</h1>
              <div className="bg-muted-3 mb-6 rounded-md sm:p-4">
                <p className="test-sm font-medium">{t("format")}</p>
                <ul className="text-emphasis ml-5 mt-2 list-disc">
                  <li>{t("uppercase_for_letters")}</li>
                  <li>{t("replace_whitespaces_underscores")}</li>
                  <li>{t("ignore_special_characters_booking_questions")}</li>
                </ul>
                <div className="mt-4">
                  <p className="test-sm w-full font-medium">{t("example_1")}</p>
                  <div className="mt-2 grid grid-cols-12">
                    <div className="test-sm text-default col-span-5 ltr:mr-2 rtl:ml-2">
                      {t("booking_question_identifier")}
                    </div>
                    <div className="test-sm text-emphasis col-span-7">{t("company_size")}</div>
                    <div className="test-sm text-default col-span-5 w-full">{t("variable")}</div>

                    <div className="test-sm text-emphasis col-span-7 break-words">
                      {" "}
                      {`{${t("company_size")
                        .replace(/[^a-zA-Z0-9 ]/g, "")
                        .trim()
                        .replace(/ /g, "_")
                        .toUpperCase()}}`}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="test-sm w-full font-medium">{t("example_2")}</p>
                  <div className="mt-2 grid grid-cols-12">
                    <div className="test-sm text-default col-span-5 ltr:mr-2 rtl:ml-2">
                      {t("booking_question_identifier")}
                    </div>
                    <div className="test-sm text-emphasis col-span-7">{t("what_help_needed")}</div>
                    <div className="test-sm text-default col-span-5">{t("variable")}</div>
                    <div className="test-sm text-emphasis col-span-7 break-words">
                      {" "}
                      {`{${t("what_help_needed")
                        .replace(/[^a-zA-Z0-9 ]/g, "")
                        .trim()
                        .replace(/ /g, "_")
                        .toUpperCase()}}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter showDivider>
              <DialogClose color="primary" />
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {agentConfigurationSheet.open && (
          <AgentConfigurationSheet
            open={agentConfigurationSheet.open}
            activeTab={agentConfigurationSheet.activeTab}
            onOpenChange={(val) => setAgentConfigurationSheet((prev) => ({ ...prev, open: val }))}
            agentId={stepAgentId}
            agentData={agentData}
            onUpdate={(data) => {
              updateAgentMutation.mutate({
                id: stepAgentId!,
                teamId: teamId,
                generalPrompt: data.generalPrompt,
                beginMessage: data.beginMessage,
                generalTools: data.generalTools,
              });
            }}
            readOnly={props.readOnly}
            teamId={teamId}
            workflowId={params?.workflow as string}
            workflowStepId={step?.id}
            form={form}
          />
        )}

        {stepAgentId && (
          <TestAgentDialog
            open={isTestAgentDialogOpen}
            onOpenChange={setIsTestAgentDialogOpen}
            agentId={stepAgentId}
            teamId={teamId}
            form={form}
          />
        )}

        {/* Unsubscribe Confirmation Dialog */}
        <Dialog open={isUnsubscribeDialogOpen} onOpenChange={setIsUnsubscribeDialogOpen}>
          <DialogContent type="creation" title={t("unsubscribe_phone_number")}>
            <div className="space-y-4">
              <p className="text-default text-sm">{t("do_you_still_want_to_unsubscribe")}</p>
              {getActivePhoneNumbers(
                agentData?.outboundPhoneNumbers?.map((phone) => ({
                  ...phone,
                  subscriptionStatus: phone.subscriptionStatus ?? undefined,
                }))
              ).length > 0 && (
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Icon name="phone" className="text-emphasis h-4 w-4" />
                    <span className="text-emphasis text-sm font-medium">
                      {formatPhoneNumber(
                        getActivePhoneNumbers(
                          agentData?.outboundPhoneNumbers?.map((phone) => ({
                            ...phone,
                            subscriptionStatus: phone.subscriptionStatus ?? undefined,
                          }))
                        )?.[0]?.phoneNumber
                      )}
                    </span>
                  </div>
                </div>
              )}
              <p className="text-subtle text-sm">{t("the_action_will_disconnect_phone_number")}</p>
            </div>
            <DialogFooter showDivider>
              <Button type="button" color="secondary" onClick={() => setIsUnsubscribeDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                type="button"
                StartIcon="trash"
                color="destructive"
                onClick={() => {
                  const activePhoneNumbers = getActivePhoneNumbers(
                    agentData?.outboundPhoneNumbers?.map((phone) => ({
                      ...phone,
                      subscriptionStatus: phone.subscriptionStatus ?? undefined,
                    }))
                  );
                  if (activePhoneNumbers?.[0]) {
                    unsubscribePhoneNumberMutation.mutate({
                      phoneNumber: activePhoneNumbers[0].phoneNumber,
                      outboundAgentId: null,
                    });
                  }
                }}
                loading={unsubscribePhoneNumberMutation.isPending}>
                {t("unsubscribe")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Step Confirmation Dialog */}
        <Dialog open={isDeleteStepDialogOpen} onOpenChange={setIsDeleteStepDialogOpen}>
          <DialogContent type="confirmation" title={t("delete_workflow_step")}>
            <div className="space-y-4">
              <p className="text-default text-sm">{t("are_you_sure_you_want_to_delete_workflow_step")}</p>
              {(() => {
                const relevantPhoneNumbers =
                  agentData?.outboundPhoneNumbers?.filter(
                    (phone) => phone.subscriptionStatus !== PhoneNumberSubscriptionStatus.CANCELLED
                  ) || [];

                return (
                  relevantPhoneNumbers.length > 0 && (
                    <>
                      <div className="bg-attention rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Icon name="info" className="text-attention mt-0.5 h-4 w-4" />
                          <div className="space-y-2">
                            <p className="text-attention text-sm font-medium">{t("this_action_will_also")}</p>
                            <ul className="text-attention list-inside list-disc space-y-1 text-sm">
                              {relevantPhoneNumbers.some(
                                (phone) => phone.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE
                              ) && <li>{t("cancel_your_phone_number_subscription")}</li>}
                              <li>{t("delete_associated_phone_number")}</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      {relevantPhoneNumbers.map((phone) => (
                        <div key={phone.phoneNumber} className="bg-muted rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Icon name="phone" className="text-emphasis h-4 w-4" />
                            <span className="text-emphasis text-sm font-medium">
                              {formatPhoneNumber(phone.phoneNumber)}
                            </span>
                            {phone.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE && (
                              <Badge variant="green" size="sm" withDot>
                                {t("active_subscription")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )
                );
              })()}
            </div>
            <DialogFooter showDivider>
              <Button type="button" color="secondary" onClick={() => setIsDeleteStepDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                type="button"
                StartIcon="trash"
                color="destructive"
                onClick={() => {
                  // Proceed with deletion
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
                  setIsDeleteStepDialogOpen(false);
                }}>
                {t("delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return <></>;
}
