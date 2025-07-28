import { zodResolver } from "@hookform/resolvers/zod";
import type { WorkflowStep } from "@prisma/client";
import { type TFunction } from "i18next";
import { useParams } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import "react-phone-number-input/style.css";
import { z } from "zod";

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
import { TimeTimeUnitInput } from "./TimeTimeUnitInput";

const agentSchema = z.object({
  generalPrompt: z.string().min(1, "General prompt is required"),
  beginMessage: z.string().min(1, "Begin message is required"),
  numberToCall: z.string().optional(),
  generalTools: z
    .array(
      z.object({
        type: z.string(),
        name: z.string(),
        description: z.string().nullish().default(null),
        cal_api_key: z.string().nullish().default(null),
        event_type_id: z.number().nullish().default(null),
        timezone: z.string().nullish().default(null),
      })
    )
    .optional(),
});

type RetellData = RouterOutputs["viewer"]["ai"]["get"]["retellData"];

type AgentFormValues = z.infer<typeof agentSchema>;

type ToolDraft = {
  type: string;
  name: string;
  description: string | null;
  cal_api_key: string | null;
  event_type_id: number | null;
  timezone: string;
};

type User = RouterOutputs["viewer"]["me"]["get"];

type WorkflowStepProps = {
  step?: WorkflowStep;
  form: UseFormReturn<FormValues>;
  user: User;
  reload?: boolean;
  setReload?: Dispatch<SetStateAction<boolean>>;
  teamId?: number;
  readOnly: boolean;
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

  const creditsTeamId = userTeams?.find(
    (team) => team.accepted && (team.role === MembershipRole.ADMIN || team.role === MembershipRole.OWNER)
  )?.id;

  const { hasActiveTeamPlan } = useHasActiveTeamPlan();

  const { data: _verifiedEmails } = trpc.viewer.workflows.getVerifiedEmails.useQuery({ teamId });

  const timeFormat = getTimeFormatStringFromUserTimeFormat(props.user.timeFormat);

  const createAgentMutation = trpc.viewer.ai.create.useMutation({
    onSuccess: async (data) => {
      const workflowId = params.workflow as string;
      const returnTo = `/workflows/${workflowId}`;
      const workflowStepId = step?.id;
      window.location.href = `/workflow-agent-setup/agent?workflowId=${workflowId}&agentId=${data.id}&workflowStepId=${workflowStepId}&returnTo=${returnTo}`;
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const { data: agentData, isPending: isAgentLoading } = trpc.viewer.ai.get.useQuery(
    { id: step?.agentId || "" },
    { enabled: !!step?.agentId }
  );

  const updateAgentMutation = trpc.viewer.ai.update.useMutation({
    onSuccess: async () => {
      showToast(t("Agent updated successfully"), "success");
      if (step?.agentId) {
        utils.viewer.ai.get.invalidate({ id: step.agentId });
      }
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const testCallMutation = trpc.viewer.ai.testCall.useMutation({
    onSuccess: async (data) => {
      showToast(data.message || t("Call initiated!"), "success");
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const verifiedNumbers = _verifiedNumbers?.map((number) => number.phoneNumber) || [];
  const verifiedEmails = _verifiedEmails || [];
  const [isAdditionalInputsDialogOpen, setIsAdditionalInputsDialogOpen] = useState(false);

  const [verificationCode, setVerificationCode] = useState("");

  const agentForm = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      generalPrompt: "",
      beginMessage: "",
      numberToCall: "",
      generalTools: [],
    },
  });

  const {
    fields: toolFields,
    append: appendTool,
    remove: removeTool,
    update: updateTool,
  } = useFieldArray({
    control: agentForm.control,
    name: "generalTools",
  });

  const [toolDialogOpen, setToolDialogOpen] = useState(false);
  const [editingToolIndex, setEditingToolIndex] = useState<number | null>(null);
  const [toolDraft, setToolDraft] = useState<ToolDraft | null>(null);

  const openAddToolDialog = () => {
    setEditingToolIndex(null);
    setToolDraft({
      type: "check_availability_cal",
      name: "",
      description: "",
      cal_api_key: null,
      event_type_id: null,
      timezone: "",
    });
    setToolDialogOpen(true);
  };

  const openEditToolDialog = (idx: number) => {
    const tool = toolFields[idx];
    if (tool) {
      setEditingToolIndex(idx);
      setToolDraft({ ...tool });
      setToolDialogOpen(true);
    }
  };

  const handleToolDialogSave = () => {
    if (!toolDraft?.name || !toolDraft?.type) return;

    if (toolDraft.type === "check_availability_cal" || toolDraft.type === "book_appointment_cal") {
      if (!toolDraft.cal_api_key) {
        showToast(t("API Key is required for Cal.com tools"), "error");
        return;
      }
      if (!toolDraft.event_type_id) {
        showToast(t("Event Type ID is required for Cal.com tools"), "error");
        return;
      }
      if (!toolDraft.timezone) {
        showToast(t("Timezone is required for Cal.com tools"), "error");
        return;
      }
    }

    if (editingToolIndex !== null) {
      updateTool(editingToolIndex, toolDraft);
    } else {
      appendTool(toolDraft);
    }
    setToolDialogOpen(false);
    setToolDraft(null);
    setEditingToolIndex(null);
  };

  const handleToolDelete = (idx: number) => {
    removeTool(idx);
  };

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
    const template = getTemplateBodyForAction({
      action,
      locale: i18n.language,
      t,
      template: step.template ?? WorkflowTemplates.REMINDER,
      timeFormat,
    });
    form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, template);
  }

  if (step && !form.getValues(`steps.${step.stepNumber - 1}.emailSubject`)) {
    const subjectTemplate = emailReminderTemplate({
      isEditingMode: true,
      locale: i18n.language,
      t,
      action: form.getValues(`steps.${step.stepNumber - 1}.action`),
      timeFormat,
    }).emailSubject;
    form.setValue(`steps.${step.stepNumber - 1}.emailSubject`, subjectTemplate);
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

  useEffect(() => {
    const llmData: RetellData = agentData?.retellData;
    if (!llmData) return;

    agentForm.reset({
      generalPrompt: llmData.generalPrompt || "",
      beginMessage: llmData.beginMessage || "",
      numberToCall: "",
      generalTools: llmData.generalTools || [],
    });
  }, [agentData, agentForm]);

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
                            } else if (isWhatsappAction(val.value)) {
                              setNumberRequiredConfigs(val.value === WorkflowActions.WHATSAPP_NUMBER, false);

                              if (!isWhatsappAction(oldValue)) {
                                form.setValue(`steps.${step.stepNumber - 1}.sender`, "");
                              }

                              setIsEmailSubjectNeeded(false);
                            } else if (isCalAIAction(val.value)) {
                              setIsPhoneNumberNeeded(false);
                              setIsSenderIsNeeded(false);
                              setIsEmailAddressNeeded(false);
                              setIsEmailSubjectNeeded(false);
                            } else {
                              setIsPhoneNumberNeeded(false);
                              setIsSenderIsNeeded(false);
                              setIsEmailAddressNeeded(val.value === WorkflowActions.EMAIL_ADDRESS);
                              setIsEmailSubjectNeeded(true);
                            }

                            form.setValue(`steps.${step.stepNumber - 1}.sendTo`, null);
                            form.clearErrors(`steps.${step.stepNumber - 1}.sendTo`);
                            form.setValue(`steps.${step.stepNumber - 1}.action`, val.value);
                            setUpdateTemplate(!updateTemplate);
                          }
                        }}
                        defaultValue={selectedAction}
                        options={actionOptions?.map((option) => ({
                          ...option,
                          creditsTeamId: teamId ?? creditsTeamId,
                        }))}
                      />
                    );
                  }}
                />
              </div>
              {isCalAIAction(form.getValues(`steps.${step.stepNumber - 1}.action`)) && !step?.agentId && (
                <div className="bg-muted mt-2 rounded-lg p-4">
                  <div className="text-center">
                    <Button
                      color="secondary"
                      onClick={async () => {
                        console.log("step", step);
                        // save the workflow first to get the step id
                        if (props.onSaveWorkflow) {
                          await props.onSaveWorkflow();
                          // After saving, get the updated step ID from the form
                          const updatedSteps = form.getValues("steps");
                          console.log("updatedSteps", updatedSteps);
                          const currentStepIndex = step.stepNumber - 1;
                          const updatedStep = updatedSteps[currentStepIndex];

                          if (updatedStep && updatedStep.id) {
                            // Create agent with the workflow step ID
                            createAgentMutation.mutate({
                              teamId,
                              workflowStepId: updatedStep.id,
                            });
                          } else {
                            showToast("Failed to get workflow step ID", "error");
                          }
                        }
                      }}
                      loading={createAgentMutation.isPending}>
                      {t("setup_cal_ai_phone_call_agent")}
                    </Button>
                  </div>
                </div>
              )}

              {step?.agentId && agentData && (
                <div className="bg-muted mt-4 rounded-lg p-4">
                  <div className="mb-4">
                    <h3 className="text-emphasis text-base font-medium">{t("Agent Configuration")}</h3>
                    <p className="text-subtle text-sm">{t("Configure your Cal AI phone call agent")}</p>
                  </div>

                  {agentData.outboundPhoneNumbers && agentData.outboundPhoneNumbers.length > 0 ? (
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <Icon name="phone" className="text-emphasis h-4 w-4" />
                        <span className="text-emphasis text-sm font-medium">
                          {t("Connected Phone Number")}:
                        </span>
                        <span className="text-emphasis text-sm">
                          {formatPhoneNumber(agentData.outboundPhoneNumbers[0].phoneNumber)}
                        </span>
                        <Badge variant="green" size="sm">
                          {t("Active")}
                        </Badge>
                      </div>
                      <p className="text-subtle mt-1 text-xs">
                        {t("This is the phone number your agent will use to make calls")}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <Icon name="phone" className="text-subtle h-4 w-4" />
                        <span className="text-subtle text-sm font-medium">
                          {t("No Phone Number Connected")}
                        </span>
                        <Badge variant="gray" size="sm">
                          {t("Inactive")}
                        </Badge>
                      </div>
                      <p className="text-subtle mt-1 text-xs">
                        {t(
                          "Your agent needs a phone number to make calls. Purchase or import a phone number to get started."
                        )}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <Label className="text-emphasis mb-2 block text-sm font-medium">
                        {t("General Prompt")} *
                      </Label>
                      <TextArea
                        {...agentForm.register("generalPrompt")}
                        placeholder={t("Enter the general prompt for the agent")}
                        className="min-h-[500px]"
                        disabled={props.readOnly}
                      />
                      <p className="text-subtle mt-1 text-xs">
                        {t("This prompt defines the agent's role and primary objectives")}
                      </p>
                    </div>

                    {/* Begin Message */}
                    <div>
                      <Label className="text-emphasis mb-2 block text-sm font-medium">
                        {t("Begin Message")} *
                      </Label>
                      <Input
                        type="text"
                        {...agentForm.register("beginMessage")}
                        placeholder={t("Enter the begin message")}
                        disabled={props.readOnly}
                      />
                      <p className="text-subtle mt-1 text-xs">
                        {t("The first message the agent will say when starting a call")}
                      </p>
                    </div>

                    {/* Test Call Section */}
                    <div className="border-subtle bg-default rounded-lg border p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-emphasis text-sm font-medium">{t("Test Your Agent")}</h4>
                          <p className="text-subtle text-xs">
                            {t("Make a test call to verify your agent's configuration")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            const numberToCall = agentForm.getValues("numberToCall");
                            if (!numberToCall) {
                              showToast(t("Please enter a number to call"), "error");
                              return;
                            }
                            testCallMutation.mutate({
                              agentId: step.agentId!,
                              phoneNumber: numberToCall,
                            });
                          }}
                          loading={testCallMutation.isPending}
                          color="secondary"
                          size="sm"
                          disabled={!agentForm.watch("numberToCall") || props.readOnly}>
                          <Icon name="phone" className="mr-2 h-4 w-4" />
                          {t("Make Test Call")}
                        </Button>
                      </div>
                      <div>
                        <Label className="text-emphasis mb-2 block text-sm font-medium">
                          {t("Phone Number to Call")}
                        </Label>
                        <Controller
                          name="numberToCall"
                          control={agentForm.control}
                          render={({ field: { onChange, value } }) => (
                            <PhoneInput
                              placeholder={t("Enter phone number to test call")}
                              value={value ?? ""}
                              onChange={(val) => onChange(val)}
                              disabled={props.readOnly}
                            />
                          )}
                        />
                        <p className="text-subtle mt-1 text-xs">
                          {t("Enter a phone number to test your agent configuration")}
                        </p>
                      </div>
                    </div>

                    {/* Functions Section */}
                    <div className="border-subtle bg-default rounded-lg border p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-emphasis text-sm font-medium">{t("Functions")}</h4>
                          <p className="text-subtle text-xs">
                            {t(
                              "Enable your agent with capabilities such as calendar bookings, call termination, etc."
                            )}
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={openAddToolDialog}
                          color="secondary"
                          size="sm"
                          disabled={props.readOnly}>
                          <Icon name="plus" className="mr-2 h-4 w-4" />
                          {t("Add Function")}
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {toolFields.map((tool, idx) => (
                          <div
                            key={tool.id}
                            className="border-subtle bg-muted hover:bg-default flex items-center justify-between rounded-lg border p-4 transition-colors">
                            <div className="flex gap-3">
                              <div className="bg-default border-subtle flex h-8 w-8 items-center justify-center rounded-md border">
                                <Icon name="zap" className="text-emphasis h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-emphasis font-medium">{tool.name}</p>
                                <p className="text-subtle text-sm">
                                  {tool.type === "check_availability_cal" && t("Check Availability")}
                                  {tool.type === "book_appointment_cal" && t("Book Appointment")}
                                  {tool.type === "end_call" && t("End Call")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                color="secondary"
                                variant="icon"
                                onClick={() => openEditToolDialog(idx)}
                                disabled={props.readOnly}>
                                <Icon name="pencil" className="h-4 w-4" />
                              </Button>
                              {tool.name !== "end_call" && (
                                <Button
                                  type="button"
                                  color="destructive"
                                  variant="icon"
                                  size="sm"
                                  onClick={() => handleToolDelete(idx)}
                                  disabled={props.readOnly}>
                                  <Icon name="trash" className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        {toolFields.length === 0 && (
                          <div className="border-subtle bg-muted flex flex-col items-center justify-center rounded-lg border p-6 text-center">
                            <Icon name="zap" className="text-subtle h-6 w-6" />
                            <p className="text-subtle mt-2 text-sm">{t("No functions configured yet")}</p>
                            <p className="text-subtle text-xs">
                              {t("Add functions to enable advanced capabilities")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Update Agent Button */}
                    {!props.readOnly && (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          onClick={agentForm.handleSubmit((data) => {
                            updateAgentMutation.mutate({
                              id: step.agentId!,
                              generalPrompt: data.generalPrompt,
                              beginMessage: data.beginMessage,
                              generalTools: data.generalTools,
                            });
                          })}
                          loading={updateAgentMutation.isPending}
                          disabled={!agentForm.formState.isDirty}
                          color="secondary"
                          size="sm">
                          {t("Update Agent")}
                        </Button>
                      </div>
                    )}
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
        <ToolsDialog
          open={toolDialogOpen}
          onOpenChange={setToolDialogOpen}
          toolDraft={toolDraft}
          setToolDraft={setToolDraft}
          onSave={handleToolDialogSave}
          isEditing={editingToolIndex !== null}
        />
      </>
    );
  }

  return <></>;
}

const ToolsDialog = ({
  open,
  onOpenChange,
  toolDraft,
  setToolDraft,
  onSave,
  isEditing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolDraft: ToolDraft | null;
  setToolDraft: (draft: ToolDraft) => void;
  onSave: () => void;
  isEditing: boolean;
}) => {
  const { t } = useLocale();

  const TOOL_TYPES = [
    { label: t("Check Availability"), value: "check_availability_cal" },
    { label: t("Book Appointment"), value: "book_appointment_cal" },
    { label: t("End Call"), value: "end_call" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        enableOverflow
        title={isEditing ? t("Edit Function") : t("Add Function")}
        type="creation">
        <div className="flex flex-col gap-4">
          <div>
            <Label>{t("Type")}</Label>
            <Select
              options={TOOL_TYPES}
              value={TOOL_TYPES.find((opt) => opt.value === toolDraft?.type) || null}
              onChange={(option) => setToolDraft((d: ToolDraft) => ({ ...d, type: option?.value || "" }))}
              placeholder={t("Select function type")}
            />
          </div>
          <div>
            <Label>{t("Name")}</Label>
            <TextField
              required
              value={toolDraft?.name || ""}
              onChange={(e) => setToolDraft((d: ToolDraft) => ({ ...d, name: e.target.value }))}
              placeholder={t("Enter function name")}
            />
          </div>
          <div>
            <Label>{t("Description")}</Label>
            <TextArea
              value={toolDraft?.description || ""}
              onChange={(e) => setToolDraft((d: ToolDraft) => ({ ...d, description: e.target.value }))}
              placeholder={t("Enter description (optional)")}
            />
          </div>
          {(toolDraft?.type === "check_availability_cal" || toolDraft?.type === "book_appointment_cal") && (
            <>
              <div>
                <Label>
                  {t("API Key (Cal.com)")}
                  <span className="text-red-500"> *</span>
                </Label>
                <TextField
                  required
                  value={toolDraft?.cal_api_key || ""}
                  onChange={(e) => setToolDraft((d: ToolDraft) => ({ ...d, cal_api_key: e.target.value }))}
                  placeholder={t("Enter Cal.com API key")}
                />
              </div>
              <div>
                <Label>
                  {t("Event Type ID (Cal.com)")}
                  <span className="text-red-500"> *</span>
                </Label>
                <TextField
                  required
                  value={toolDraft?.event_type_id || ""}
                  onChange={(e) =>
                    setToolDraft((d: ToolDraft) => ({
                      ...d,
                      event_type_id: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  placeholder={t("Enter Event Type ID")}
                  type="number"
                />
              </div>
              <div>
                <Label>
                  {t("Timezone")}
                  <span className="text-red-500"> *</span>
                </Label>
                <TextField
                  required
                  value={toolDraft?.timezone || ""}
                  onChange={(e) => setToolDraft((d: ToolDraft) => ({ ...d, timezone: e.target.value }))}
                  placeholder={t("America/Los_Angeles")}
                />
                <p className="text-subtle mt-1 text-xs">{t("Required for Cal.com calendar integration")}</p>
              </div>
            </>
          )}
        </div>
        <DialogFooter showDivider>
          <Button type="button" color="secondary" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button type="button" onClick={onSave}>
            {t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
