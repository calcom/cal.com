"use client";

import { cn } from "@calid/features/lib/cn";
import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@calid/features/ui/components/card";
import { Collapsible, CollapsibleContent } from "@calid/features/ui/components/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { Icon } from "@calid/features/ui/components/icon";
import { Checkbox } from "@calid/features/ui/components/input/checkbox-field";
import { Input } from "@calid/features/ui/components/input/input";
import { TextArea } from "@calid/features/ui/components/input/text-area";
import { Label } from "@calid/features/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@calid/features/ui/components/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm, Controller } from "react-hook-form";

import PhoneInput from "@calcom/features/components/phone-input";
import Shell, { ShellMain } from "@calcom/features/shell/Shell";
import { SENDER_ID, SENDER_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { getTimeFormatStringFromUserTimeFormat, TimeFormat } from "@calcom/lib/timeFormat";
import type { TimeUnit, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { MembershipRole, WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Alert } from "@calcom/ui/components/alert";
import { Editor } from "@calcom/ui/components/editor";
import { AddVariablesDropdown } from "@calcom/ui/components/editor";
import { showToast } from "@calcom/ui/components/toast";

import { DYNAMIC_TEXT_VARIABLES } from "../config/constants";
import { getWorkflowTemplateOptions, getWorkflowTriggerOptions } from "../config/utils";
import {
  isSMSAction,
  isWhatsappAction,
  isSMSOrWhatsappAction,
  translateVariablesToEnglish,
  translateTextVariables as getTranslatedText,
  getTemplateBodyForAction,
  shouldScheduleEmailReminder,
} from "../config/utils";
import { workflowFormSchema as formSchema } from "../config/validation";
import emailRatingTemplate from "../templates/email/ratingTemplate";
import emailReminderTemplate from "../templates/email/reminder";
import emailThankYouTemplate from "../templates/email/thankYouTemplate";

// Types migrated from old implementation

type WorkflowStep = {
  id: number;
  stepNumber: number;
  action: WorkflowActions;
  workflowId: number;
  sendTo: string | null;
  reminderBody: string | null;
  emailSubject: string | null;
  template: WorkflowTemplates;
  numberRequired: boolean;
  sender: string;
  senderName: string | null;
  numberVerificationPending: boolean;
  includeCalendarEvent: boolean;
  verifiedAt: Date | null;
};

export type FormValues = {
  name: string;
  activeOn: Option[];
  steps: (WorkflowStep & { senderName: string | null })[];
  trigger: WorkflowTriggerEvents;
  time?: number;
  timeUnit?: TimeUnit;
  selectAll: boolean;
};

type Option = {
  value: string;
  label: string;
};

type User = RouterOutputs["viewer"]["me"]["get"];

const VariableDropdown: React.FC<{
  onSelect: (variable: string) => void;
}> = ({ onSelect }) => {
  return <AddVariablesDropdown addVariable={onSelect} variables={DYNAMIC_TEXT_VARIABLES} />;
};

export interface WorkflowBuilderProps {
  template?: any;
  editWorkflow?: any;
  workflowId?: number;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ template, editWorkflow, workflowId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useLocale();
  const session = useSession();

  // Real data hooks from old implementation
  const userQuery = useMeQuery();
  const user = userQuery.data;
  const utils = trpc.useUtils();

  // Form setup with real schema validation
  const form = useForm<FormValues>({
    mode: "onBlur",
    resolver: zodResolver(formSchema),
  });

  // Real data states
  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);
  const [isAllDataLoaded, setIsAllDataLoaded] = useState(false);
  const [isMixedEventType, setIsMixedEventType] = useState(false);

  // Add ref to prevent infinite loops
  const dataLoadedRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  // Get workflow data from tRPC
  const {
    data: workflowData,
    isError,
    error,
    isPending: isPendingWorkflow,
  } = trpc.viewer.workflows.calid_get.useQuery(workflowId ? { id: workflowId } : {}, {
    enabled: !!workflowId,
  });

  // Get verified numbers and emails
  const { data: verifiedNumbersData } = trpc.viewer.workflows.calid_getVerifiedNumbers.useQuery(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    workflowData?.calIdTeamId ? { calIdTeamId: workflowData?.calIdTeamId } : {},
    {
      enabled: !!workflowData?.calIdTeamId,
    }
  );

  const { data: verifiedEmailsData } = trpc.viewer.workflows.calid_getVerifiedEmails.useQuery(
    workflowData?.calIdTeamId
      ? {
          calIdTeamId: workflowData?.calIdTeamId,
        }
      : {},
    { enabled: !!workflowData?.calIdTeamId }
  );

  // Get workflow action options
  const { data: actionOptions } = trpc.viewer.workflows.calid_getWorkflowActionOptions.useQuery();

  // Get time format
  const timeFormat = user ? getTimeFormatStringFromUserTimeFormat(user.timeFormat) : TimeFormat.TWELVE_HOUR;

  // Get event type options
  // const isOrg = workflowData?.team?.isOrganization ?? false;
  //TODO: TEAM_ORG
  const isOrg = false;
  const teamId = workflowData?.calIdTeamId ?? undefined;

  const { data: eventTypeData, isPending: isPendingEventTypes } =
    trpc.viewer.eventTypes.getCalIdTeamAndEventTypeOptions.useQuery(
      { teamId, isOrg },
      { enabled: !isPendingWorkflow }
    );

  // Process event type options
  const allEventTypeOptions = useMemo(() => {
    let options = eventTypeData?.eventTypeOptions ?? [];

    if (!teamId && isMixedEventType && isInitialLoadRef.current) {
      const distinctEventTypes = new Set(options.map((opt) => opt.value));
      const additionalOptions = selectedOptions.filter((opt) => !distinctEventTypes.has(opt.value));
      options = [...options, ...additionalOptions];
    }

    return options;
  }, [eventTypeData?.eventTypeOptions, teamId, isMixedEventType]);

  const teamOptions = useMemo(() => eventTypeData?.teamOptions ?? [], [eventTypeData?.teamOptions]);

  // Permission check
  const readOnly = useMemo(() => {
    return (
      workflowData?.calIdTeam?.members?.find((member) => member.userId === session.data?.user.id)?.role ===
      MembershipRole.MEMBER
    );
  }, [workflowData?.calIdTeam?.members, session.data?.user.id]);

  // UI state variables
  const [workflowName, setWorkflowName] = useState("");
  const [trigger, setTrigger] = useState<WorkflowTriggerEvents | "">("");
  const [triggerTiming, setTriggerTiming] = useState("immediately");
  const [customTime, setCustomTime] = useState("");
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("HOUR");
  const [showEventTypeSection, setShowEventTypeSection] = useState(false);
  const [showTriggerSection, setShowTriggerSection] = useState(false);
  const [showActionsSection, setShowActionsSection] = useState(false);

  // Step-specific states for verification
  const [verificationCodes, setVerificationCodes] = useState<{ [stepId: string]: string }>({});
  const [numberVerificationStatus, setNumberVerificationStatus] = useState<{ [stepId: string]: boolean }>({});
  const [emailVerificationStatus, setEmailVerificationStatus] = useState<{ [stepId: string]: boolean }>({});
  //  Add states to track when OTP was sent
  const [otpSentForPhone, setOtpSentForPhone] = useState<{ [stepId: string]: boolean }>({});
  const [otpSentForEmail, setOtpSentForEmail] = useState<{ [stepId: string]: boolean }>({});

  // Enhanced actions state to match WorkflowStep structure
  const [actions, setActions] = useState<WorkflowStep[]>([]);

  // Template update tracker -  Changed to object to track individual step updates
  const [updateTemplate, setUpdateTemplate] = useState<{ [stepId: string]: number }>({});
  const [firstRender, setFirstRender] = useState(true);

  // Get trigger and template options
  const triggerOptions = getWorkflowTriggerOptions(t);

  // Verification mutations -  Added proper success handlers for verification status updates
  const sendVerificationCodeMutation = trpc.viewer.workflows.calid_sendVerificationCode.useMutation({
    onSuccess: async (data, variables) => {
      showToast(t("verification_code_sent"), "success");
      //  Track that OTP was sent for this phone number
      if (variables?.phoneNumber) {
        actions.forEach((step) => {
          if (step.sendTo === variables.phoneNumber) {
            setOtpSentForPhone((prev) => ({ ...prev, [step.id.toString()]: true }));
          }
        });
      }
    },
    onError: async (error) => {
      showToast(error.message, "error");
    },
  });

  const verifyPhoneNumberMutation = trpc.viewer.workflows.calid_verifyPhoneNumber.useMutation({
    onSuccess: async (isVerified, variables) => {
      showToast(isVerified ? t("verified_successfully") : t("wrong_code"), "success");

      //  Update verification status immediately for UI feedback
      if (isVerified && variables?.phoneNumber) {
        // Find the step with this phone number and update its verification status
        setNumberVerificationStatus((prev) => {
          const newStatus = { ...prev };
          actions.forEach((step) => {
            if (step.sendTo === variables.phoneNumber) {
              newStatus[step.id.toString()] = true;
              // Clear OTP sent status when verified
              setOtpSentForPhone((prevOtp) => ({ ...prevOtp, [step.id.toString()]: false }));
              setVerificationCodes((prevCodes) => ({ ...prevCodes, [step.id.toString()]: "" }));
            }
          });
          return newStatus;
        });
      }

      utils.viewer.workflows.calid_getVerifiedNumbers.invalidate();
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  const sendEmailVerificationCodeMutation = trpc.viewer.auth.sendVerifyEmailCode.useMutation({
    onSuccess(data, variables) {
      showToast(t("email_sent"), "success");
      if (variables?.email) {
        actions.forEach((step) => {
          if (step.sendTo === variables.email) {
            setOtpSentForEmail((prev) => ({ ...prev, [step.id.toString()]: true }));
          }
        });
      }
    },
    onError: () => {
      showToast(t("email_not_sent"), "error");
    },
  });

  const verifyEmailCodeMutation = trpc.viewer.workflows.calid_verifyEmailCode.useMutation({
    onSuccess: (isVerified, variables) => {
      showToast(isVerified ? t("verified_successfully") : t("wrong_code"), "success");

      if (isVerified && variables?.email) {
        // Find the step with this email and update its verification status
        setEmailVerificationStatus((prev) => {
          const newStatus = { ...prev };
          actions.forEach((step) => {
            if (step.sendTo === variables.email) {
              newStatus[step.id.toString()] = true;
              // Clear OTP sent status when verified
              setOtpSentForEmail((prevOtp) => ({ ...prevOtp, [step.id.toString()]: false }));
              setVerificationCodes((prevCodes) => ({ ...prevCodes, [step.id.toString()]: "" }));
            }
          });
          return newStatus;
        });
      }

      utils.viewer.workflows.calid_getVerifiedEmails.invalidate();
    },
    onError: (err) => {
      if (err.message === "invalid_code") {
        showToast(t("code_provided_invalid"), "error");
      }
    },
  });

  // Update mutation
  const updateMutation = trpc.viewer.workflows.calid_update.useMutation({
    onSuccess: async ({ workflow }) => {
      if (workflow) {
        utils.viewer.workflows.calid_get.setData({ id: workflow.id }, workflow);
        showToast(
          t("workflow_updated_successfully", {
            workflowName: workflow.name,
          }),
          "success"
        );
      }
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  // Helper functions
  const getNumberVerificationStatus = useCallback(
    (step: WorkflowStep) => {
      return !!verifiedNumbersData?.find((number) => number.phoneNumber === step.sendTo);
    },
    [verifiedNumbersData]
  );

  const getEmailVerificationStatus = useCallback(
    (step: WorkflowStep) => {
      return !!verifiedEmailsData?.find((email) => email === step.sendTo);
    },
    [verifiedEmailsData]
  );

  const isValidPhoneNumber = useCallback((phoneNumber: string) => {
    // Basic phone number validation - should have at least 10 digits
    const cleanNumber = phoneNumber?.replace(/\D/g, "") || "";
    return cleanNumber.length >= 10;
  }, []);

  const isValidEmail = useCallback((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email || "");
  }, []);

  const triggerTemplateUpdate = useCallback((stepId: number) => {
    setUpdateTemplate((prev) => ({
      ...prev,
      [stepId.toString()]: (prev[stepId.toString()] || 0) + 1,
    }));
  }, []);

  // Set form data function
  const setFormData = useCallback(
    (workflowDataInput: RouterOutputs["viewer"]["workflows"]["calid_get"] | undefined) => {
      if (workflowDataInput && !dataLoadedRef.current) {
        dataLoadedRef.current = true;

        if (
          workflowDataInput.userId &&
          workflowDataInput.activeOn.find((active) => !!active.eventType.teamId)
        ) {
          setIsMixedEventType(true);
        }

        let activeOn;

        if (workflowDataInput.isActiveOnAll) {
          activeOn = isOrg ? teamOptions : allEventTypeOptions;
        } else {
          if (isOrg) {
            activeOn = workflowDataInput.activeOnTeams?.flatMap((active) => ({
              value: String(active.calIdTeam.id) || "",
              label: active.calIdTeam.slug || "",
            }));
          } else {
            activeOn = workflowDataInput.activeOn
              ? workflowDataInput.activeOn.flatMap((active) => {
                  if (workflowDataInput.calIdTeamId && active.eventType.parentId) return [];
                  return {
                    value: active.eventType.id.toString(),
                    label: active.eventType.title,
                  };
                })
              : [];
          }
        }

        setSelectedOptions(activeOn || []);

        // Translate dynamic variables into local language
        const steps =
          workflowDataInput.steps?.map((step) => {
            const updatedStep = {
              ...step,
              numberRequired: step.numberRequired ?? false,
              senderName: step.sender,
              sender: isSMSAction(step.action) ? step.sender ?? SENDER_ID : SENDER_ID,
            };
            if (step.reminderBody) {
              updatedStep.reminderBody = getTranslatedText(step.reminderBody || "", {
                locale: i18n.language,
                t,
              });
            }
            if (step.emailSubject) {
              updatedStep.emailSubject = getTranslatedText(step.emailSubject || "", {
                locale: i18n.language,
                t,
              });
            }
            return updatedStep;
          }) || [];

        // Update form values
        form.setValue("name", workflowDataInput.name);
        form.setValue("steps", steps);
        form.setValue("trigger", workflowDataInput.trigger);
        form.setValue("time", workflowDataInput.time || undefined);
        form.setValue("timeUnit", workflowDataInput.timeUnit || undefined);
        form.setValue("activeOn", activeOn || []);
        form.setValue("selectAll", workflowDataInput.isActiveOnAll ?? false);

        // Update UI state
        setWorkflowName(workflowDataInput.name);
        setTrigger(workflowDataInput.trigger);
        setCustomTime(String(workflowDataInput.time || ""));
        setTimeUnit(workflowDataInput.timeUnit || "HOUR");
        setTriggerTiming(workflowDataInput.time ? "custom" : "immediately");

        // Set actions to the workflow steps
        setActions(steps);

        // Initialize verification status
        const numberStatus: { [key: string]: boolean } = {};
        const emailStatus: { [key: string]: boolean } = {};

        steps.forEach((step) => {
          const stepId = step.id.toString();
          if (isSMSOrWhatsappAction(step.action) && step.sendTo) {
            numberStatus[stepId] = getNumberVerificationStatus(step);
          }
          if (step.action === WorkflowActions.EMAIL_ADDRESS && step.sendTo) {
            emailStatus[stepId] = getEmailVerificationStatus(step);
          }
        });

        setNumberVerificationStatus(numberStatus);
        setEmailVerificationStatus(emailStatus);

        // Show sections based on existing data
        setShowEventTypeSection(true);
        setShowTriggerSection(true);
        setShowActionsSection(steps.length > 0);

        setIsAllDataLoaded(true);
        isInitialLoadRef.current = false;
      }
    },
    [form, isOrg, teamOptions, i18n.language, t, getNumberVerificationStatus, getEmailVerificationStatus]
  );

  // Load initial data only once
  useEffect(() => {
    if (!isPendingWorkflow && workflowData && !dataLoadedRef.current) {
      setFormData(workflowData);
    }
  }, [isPendingWorkflow, workflowData, setFormData]);

  // Auto-show sections based on data completion
  useEffect(() => {
    if (workflowName.trim()) {
      setShowEventTypeSection(true);
    }
  }, [workflowName]);

  useEffect(() => {
    if (selectedOptions.length > 0) {
      setShowTriggerSection(true);
    }
  }, [selectedOptions]);

  useEffect(() => {
    if (trigger && (triggerTiming === "immediately" || (triggerTiming === "custom" && customTime))) {
      setShowActionsSection(true);
    }
  }, [trigger, triggerTiming, customTime]);

  const getTriggerText = () => {
    const selectedTrigger = triggerOptions.find((t) => t.value === trigger);
    if (!selectedTrigger) return "";
    const baseText = selectedTrigger.label.toLowerCase();
    if (triggerTiming === "immediately") {
      return `Immediately when ${baseText.replace("when ", "").replace("before ", "").replace("after ", "")}`;
    } else {
      const timeText = `${customTime} ${timeUnit}`;
      if (trigger === "BEFORE_EVENT") {
        return `${timeText} before event starts`;
      } else if (trigger === "AFTER_EVENT") {
        return `${timeText} after event ends`;
      } else {
        return `${timeText} after ${baseText.replace("when ", "")}`;
      }
    }
  };

  // Event type selection handler
  const handleEventTypeSelection = useCallback(
    (categoryId: string, typeId: string) => {
      setSelectedOptions((prev) => {
        const isSelected = prev.some((option) => option.value === typeId);
        let newOptions;
        if (isSelected) {
          newOptions = prev.filter((option) => option.value !== typeId);
        } else {
          const option = allEventTypeOptions.find((opt) => opt.value === typeId);
          if (option) {
            newOptions = [...prev, option];
          } else {
            return prev;
          }
        }

        form.setValue("activeOn", newOptions);
        return newOptions;
      });
    },
    [allEventTypeOptions, form]
  );

  const addAction = useCallback(() => {
    const newStep: WorkflowStep = {
      id: -Date.now(), // Use negative ID for new steps
      stepNumber: actions.length + 1,
      action: WorkflowActions.EMAIL_ATTENDEE,
      workflowId: workflowId!,
      sendTo: null,
      reminderBody: null,
      emailSubject: null,
      template: WorkflowTemplates.REMINDER,
      numberRequired: false,
      sender: SENDER_ID,
      senderName: SENDER_NAME,
      numberVerificationPending: false,
      includeCalendarEvent: false,
      verifiedAt: null,
    };

    // Set default template content
    const template = getTemplateBodyForAction({
      action: newStep.action,
      locale: i18n.language,
      t,
      template: WorkflowTemplates.REMINDER,
      timeFormat,
    });
    newStep.reminderBody = template;

    if (shouldScheduleEmailReminder(newStep.action)) {
      newStep.emailSubject = emailReminderTemplate({
        isEditingMode: true,
        locale: i18n.language,
        action: newStep.action,
        timeFormat,
      }).emailSubject;
    }

    setActions((prev) => [...prev, newStep]);

    // Update form
    const updatedSteps = [...form.getValues("steps"), newStep];
    form.setValue("steps", updatedSteps);

    triggerTemplateUpdate(newStep.id);
  }, [actions.length, workflowId, i18n.language, t, timeFormat, form, triggerTemplateUpdate]);

  const removeAction = useCallback(
    (stepId: number) => {
      setActions((prev) => {
        const filtered = prev.filter((action) => action.id !== stepId);
        // Update step numbers
        const reordered = filtered.map((step, index) => ({
          ...step,
          stepNumber: index + 1,
        }));

        // Update form
        form.setValue("steps", reordered);
        return reordered;
      });

      // Clean up verification states
      const stepIdStr = stepId.toString();
      setVerificationCodes((prev) => {
        const { [stepIdStr]: removed, ...rest } = prev;
        return rest;
      });
      setNumberVerificationStatus((prev) => {
        const { [stepIdStr]: removed, ...rest } = prev;
        return rest;
      });
      setEmailVerificationStatus((prev) => {
        const { [stepIdStr]: removed, ...rest } = prev;
        return rest;
      });
      setOtpSentForPhone((prev) => {
        const { [stepIdStr]: removed, ...rest } = prev;
        return rest;
      });
      setOtpSentForEmail((prev) => {
        const { [stepIdStr]: removed, ...rest } = prev;
        return rest;
      });
      setUpdateTemplate((prev) => {
        const { [stepIdStr]: removed, ...rest } = prev;
        return rest;
      });
    },
    [form]
  );

  const updateAction = useCallback(
    (stepId: number, field: keyof WorkflowStep, value: any) => {
      setActions((prev) => {
        const updated = prev.map((action) => {
          if (action.id === stepId) {
            const updatedAction = { ...action, [field]: value };

            // Handle action type changes
            if (field === "action") {
              const newAction = value as WorkflowActions;

              // Get fresh template content and completely replace reminderBody
              const freshTemplate = getTemplateBodyForAction({
                action: newAction,
                locale: i18n.language,
                t,
                template: WorkflowTemplates.REMINDER,
                timeFormat,
              });
              updatedAction.reminderBody = freshTemplate;
              updatedAction.template = WorkflowTemplates.REMINDER;

              // Reset sender and other fields
              if (isSMSAction(newAction)) {
                updatedAction.sender = SENDER_ID;
                updatedAction.senderName = SENDER_ID;
              } else if (isWhatsappAction(newAction)) {
                updatedAction.sender = "";
                updatedAction.senderName = SENDER_NAME;
              } else {
                updatedAction.sender = SENDER_ID;
                updatedAction.senderName = SENDER_NAME;
              }

              // Reset sendTo
              updatedAction.sendTo = null;

              // Reset OTP/verification states
              const stepIdStr = stepId.toString();
              setOtpSentForPhone((prev) => ({ ...prev, [stepIdStr]: false }));
              setOtpSentForEmail((prev) => ({ ...prev, [stepIdStr]: false }));
              setVerificationCodes((prev) => ({ ...prev, [stepIdStr]: "" }));

              // Set email subject if action is email reminder
              if (shouldScheduleEmailReminder(newAction)) {
                updatedAction.emailSubject = emailReminderTemplate({
                  isEditingMode: true,
                  locale: i18n.language,
                  action: newAction,
                  timeFormat,
                }).emailSubject;
              }

              // Trigger template update
              triggerTemplateUpdate(stepId);
            }

            // Handle template changes
            if (field === "template") {
              const newTemplate = value as WorkflowTemplates;
              const actionType = updatedAction.action;

              const freshTemplateBody = getTemplateBodyForAction({
                action: actionType,
                locale: i18n.language,
                t,
                template: newTemplate,
                timeFormat,
              });

              // Always replace (prevent duplication)
              updatedAction.reminderBody = freshTemplateBody;

              // Update email subject depending on template
              if (shouldScheduleEmailReminder(actionType)) {
                if (newTemplate === WorkflowTemplates.REMINDER) {
                  updatedAction.emailSubject = emailReminderTemplate({
                    isEditingMode: true,
                    locale: i18n.language,
                    action: actionType,
                    timeFormat,
                  }).emailSubject;
                } else if (newTemplate === WorkflowTemplates.RATING) {
                  updatedAction.emailSubject = emailRatingTemplate({
                    isEditingMode: true,
                    locale: i18n.language,
                    action: actionType,
                    timeFormat,
                  }).emailSubject;
                } else if (newTemplate === WorkflowTemplates.THANKYOU) {
                  updatedAction.emailSubject = emailThankYouTemplate({
                    isEditingMode: true,
                    timeFormat,
                  }).emailSubject;
                }
              }

              triggerTemplateUpdate(stepId);
            }

            return updatedAction;
          }
          return action;
        });

        form.setValue("steps", updated);
        return updated;
      });
    },
    [form, i18n.language, t, timeFormat, triggerTemplateUpdate]
  );

  const toggleActionExpanded = useCallback((stepId: number) => {
    // This is just for UI state, we can track it separately if needed
    // For now, all actions will be expanded
  }, []);

  const insertVariable = useCallback(
    (stepId: number, field: string, variable: string) => {
      const action = actions.find((a) => a.id === stepId);
      if (action) {
        const currentValue = (action[field as keyof WorkflowStep] as string) || "";
        const newValue = `${currentValue}{${variable.toUpperCase().replace(/ /g, "_")}}`;
        updateAction(stepId, field as keyof WorkflowStep, newValue);
      }
    },
    [actions, updateAction]
  );

  const isEmailAction = (action: WorkflowActions) =>
    action === WorkflowActions.EMAIL_ATTENDEE ||
    action === WorkflowActions.EMAIL_HOST ||
    action === WorkflowActions.EMAIL_ADDRESS;

  const isSMSActionType = (action: WorkflowActions) => isSMSAction(action) || isWhatsappAction(action);

  // Real save handler using tRPC mutation
  const handleSaveWorkflow = useCallback(async () => {
    let activeOnIds: number[] = [];
    let isEmpty = false;
    let isVerified = true;

    // Validate and prepare steps
    const steps = actions.map((action, index) => {
      const step = {
        ...action,
        stepNumber: index + 1,
      };

      // Validation logic
      const strippedHtml = step.reminderBody?.replace(/<[^>]+>/g, "") || "";
      const isBodyEmpty = !isSMSOrWhatsappAction(step.action) && strippedHtml.length <= 1;

      if (isBodyEmpty) {
        isEmpty = true;
        showToast(t("fill_this_field"), "error");
      }

      // Translate variables back to English
      if (step.reminderBody) {
        step.reminderBody = translateVariablesToEnglish(step.reminderBody, {
          locale: i18n.language,
          t,
        });
      }
      if (step.emailSubject) {
        step.emailSubject = translateVariablesToEnglish(step.emailSubject, {
          locale: i18n.language,
          t,
        });
      }

      // Check verification for SMS/WhatsApp actions
      if (
        (step.action === WorkflowActions.SMS_NUMBER || step.action === WorkflowActions.WHATSAPP_NUMBER) &&
        !verifiedNumbersData?.find((verifiedNumber) => verifiedNumber.phoneNumber === step.sendTo)
      ) {
        isVerified = false;
        showToast(t("not_verified"), "error");
      }

      if (
        step.action === WorkflowActions.EMAIL_ADDRESS &&
        !verifiedEmailsData?.find((verifiedEmail) => verifiedEmail === step.sendTo)
      ) {
        isVerified = false;
        showToast(t("not_verified"), "error");
      }

      return step;
    });

    if (!isEmpty && isVerified && workflowId) {
      if (selectedOptions.length > 0) {
        activeOnIds = selectedOptions
          .filter((option) => option.value !== "all")
          .map((option) => parseInt(option.value, 10));
      }

      updateMutation.mutate({
        id: workflowId,
        name: workflowName,
        activeOn: activeOnIds,
        steps,
        trigger: trigger as WorkflowTriggerEvents,
        time: triggerTiming === "custom" ? parseInt(customTime) || null : null,
        timeUnit: triggerTiming === "custom" ? timeUnit : null,
        isActiveOnAll: form.getValues("selectAll") || false,
      });
    }
  }, [
    actions,
    selectedOptions,
    workflowName,
    trigger,
    triggerTiming,
    customTime,
    timeUnit,
    workflowId,
    updateMutation,
    verifiedNumbersData,
    verifiedEmailsData,
    t,
    i18n.language,
    form,
  ]);

  // Helper function to send verification code
  const handleSendVerificationCode = useCallback(
    (step: WorkflowStep) => {
      if (isSMSOrWhatsappAction(step.action) && step.sendTo) {
        sendVerificationCodeMutation.mutate({
          phoneNumber: step.sendTo,
        });
      }
    },
    [sendVerificationCodeMutation]
  );

  // Helper function to verify phone number - Pass phoneNumber to mutation variables
  const handleVerifyPhoneNumber = useCallback(
    (step: WorkflowStep) => {
      const stepId = step.id.toString();
      const code = verificationCodes[stepId];

      if (code && step.sendTo) {
        verifyPhoneNumberMutation.mutate({
          phoneNumber: step.sendTo,
          code,
          calIdTeamId: workflowData?.calIdTeam?.id,
        });
      }
    },
    [verificationCodes, verifyPhoneNumberMutation, workflowData?.calIdTeam?.id]
  );

  // Helper function to send email verification
  const handleSendEmailVerification = useCallback(
    (step: WorkflowStep) => {
      if (step.sendTo) {
        sendEmailVerificationCodeMutation.mutate({
          email: step.sendTo,
          isVerifyingEmail: true,
        });
      }
    },
    [sendEmailVerificationCodeMutation]
  );

  // Helper function to verify email -  Pass email to mutation variables
  const handleVerifyEmail = useCallback(
    (step: WorkflowStep) => {
      const stepId = step.id.toString();
      const code = verificationCodes[stepId];

      if (code && step.sendTo) {
        verifyEmailCodeMutation.mutate({
          code,
          email: step.sendTo,
          calIdTeamId: workflowData?.calIdTeam?.id,
        });
      }
    },
    [verificationCodes, verifyEmailCodeMutation, workflowData?.calIdTeam?.id]
  );

  // Loading and error states
  const isPending = isPendingWorkflow || isPendingEventTypes;

  return (
    <Shell withoutMain backPath="/workflows">
      <ShellMain
        backPath="/workflows"
        title={workflowData && workflowData.name ? workflowData.name : "Untitled"}
        subtitle={t("workflows_edit_description")}
        CTA={
          !readOnly && (
            <div>
              <Button
                data-testid="save-workflow"
                onClick={handleSaveWorkflow}
                loading={updateMutation.isPending}>
                {t("save")}
              </Button>
            </div>
          )
        }
        heading={
          isAllDataLoaded && (
            <div className="flex">
              <div className={cn(workflowData && !workflowData.name ? "text-muted" : "")}>
                {workflowData && workflowData.name ? workflowData.name : "untitled"}
              </div>
              {workflowData && workflowData.calIdTeam && (
                <Badge className="ml-4 mt-1" variant="default">
                  {workflowData.calIdTeam.name}
                </Badge>
              )}
              {readOnly && (
                <Badge className="ml-4 mt-1" variant="default">
                  {t("readonly")}
                </Badge>
              )}
            </div>
          )
        }>
        {!session.data ? (
          <div>Please log in to access this feature.</div>
        ) : isError ? (
          <Alert severity="error" title="Something went wrong" message={error?.message ?? ""} />
        ) : isPending ? (
          <div>Loading...</div>
        ) : (
          <div className="bg-card flex justify-center p-6 p-8">
            <div className="bg-card mx-auto w-full p-6">
              <div className="mx-auto max-w-2xl space-y-6">
                <div className="bg-card w-full space-y-6 rounded-lg border p-6">
                  {/* Workflow name section */}
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="workflow-name">Workflow name</Label>
                      <Input
                        id="workflow-name"
                        value={workflowName}
                        onChange={(e) => setWorkflowName(e.target.value)}
                        className="mt-2"
                        placeholder="Enter workflow name"
                        disabled={readOnly}
                      />
                    </div>

                    {/* Event Type Selection */}
                    {showEventTypeSection && (
                      <div className="animate-slide-in-up">
                        <div>
                          <Label>
                            {isOrg
                              ? "Which teams will this apply to?"
                              : "Which event types will this apply to?"}
                          </Label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                color="secondary"
                                className="mt-2 w-full justify-between"
                                disabled={readOnly}>
                                {selectedOptions.length > 0
                                  ? `${selectedOptions.length} ${isOrg ? "teams" : "event types"} selected`
                                  : `Select ${isOrg ? "teams" : "event types"}...`}
                                <Icon name="chevron-down" className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-80">
                              <div className="space-y-4 p-4">
                                {(isOrg ? teamOptions : allEventTypeOptions).map((option) => (
                                  <div key={option.value} className=" flex items-center space-x-2">
                                    <Checkbox
                                      id={option.value}
                                      checked={selectedOptions.some(
                                        (selected) => selected.value === option.value
                                      )}
                                      onCheckedChange={() => handleEventTypeSelection("", option.value)}
                                      disabled={readOnly}
                                    />
                                    <Label htmlFor={option.value} className="text-sm">
                                      {option.label}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Trigger Section */}
                {showTriggerSection && (
                  <div className="animate-slide-in-up">
                    <Card className="animate-slide-in-up">
                      <CardHeader>
                        <CardTitle>When this happens</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Select
                            value={trigger}
                            onValueChange={(val: WorkflowTriggerEvents) => setTrigger(val)}
                            disabled={readOnly}>
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select an occurrence" />
                            </SelectTrigger>
                            <SelectContent className="bg-default">
                              {triggerOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {trigger && (
                          <div className="animate-fade-in space-y-4">
                            <div>
                              <Label className="text-sm">
                                How long {trigger === "BEFORE_EVENT" ? "before" : "after"}{" "}
                                {triggerOptions
                                  .find((t) => t.value === trigger)
                                  ?.label.toLowerCase()
                                  .replace("when ", "")
                                  .replace("before ", "")
                                  .replace("after ", "")}
                                ?
                              </Label>

                              <div className="mt-2 space-y-3">
                                {trigger !== "BEFORE_EVENT" && trigger !== "AFTER_EVENT" && (
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      id="immediately"
                                      name="timing"
                                      value="immediately"
                                      checked={triggerTiming === "immediately"}
                                      onChange={(e) => setTriggerTiming(e.target.value)}
                                      disabled={readOnly}
                                    />
                                    <Label htmlFor="immediately" className="text-muted-foreground text-sm">
                                      Immediately when{" "}
                                      {triggerOptions
                                        .find((t) => t.value === trigger)
                                        ?.label.toLowerCase()
                                        .replace("when ", "")
                                        .replace("before ", "")
                                        .replace("after ", "")}
                                    </Label>
                                  </div>
                                )}

                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="custom"
                                    name="timing"
                                    value="custom"
                                    checked={triggerTiming === "custom"}
                                    onChange={(e) => setTriggerTiming(e.target.value)}
                                    disabled={readOnly}
                                  />
                                  <div className="flex flex-1 items-center space-x-2">
                                    <Input
                                      value={customTime}
                                      onChange={(e) => setCustomTime(e.target.value)}
                                      className="w-20"
                                      placeholder="24"
                                      onClick={() => setTriggerTiming("custom")}
                                      disabled={readOnly}
                                    />
                                    <Select
                                      value={timeUnit}
                                      onValueChange={(val: TimeUnit) => setTimeUnit(val)}
                                      disabled={readOnly}>
                                      <SelectTrigger className="w-24">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-default">
                                        <SelectItem value="MINUTE">minutes</SelectItem>
                                        <SelectItem value="HOUR">hours</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <span className="text-muted-foreground text-sm">
                                      {trigger === "BEFORE_EVENT" ? "before" : "after"}{" "}
                                      {triggerOptions
                                        .find((t) => t.value === trigger)
                                        ?.label.toLowerCase()
                                        .replace("when ", "")
                                        .replace("before ", "")
                                        .replace("after ", "")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Actions Section - Enhanced with proper WorkflowStep implementation */}
                {showActionsSection && (
                  <div className="animate-slide-in-up">
                    <Card className="animate-slide-in-up">
                      <CardHeader>
                        <CardTitle>Do this</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {actions.map((step) => {
                          const stepId = step.id.toString();
                          const isNumberVerified = numberVerificationStatus[stepId] || false;
                          const isEmailVerified = emailVerificationStatus[stepId] || false;
                          const verificationCode = verificationCodes[stepId] || "";
                          const templateOptions = getWorkflowTemplateOptions(t, step.action);
                          const stepTemplateUpdate = updateTemplate[stepId] || 0;
                          const isPhoneOtpSent = otpSentForPhone[stepId] || false;
                          const isEmailOtpSent = otpSentForEmail[stepId] || false;
                          const isPhoneValid = isValidPhoneNumber(step.sendTo || "");
                          const isEmailValid = isValidEmail(step.sendTo || "");

                          return (
                            <Card key={step.id} className="border">
                              <Collapsible open={true}>
                                <div className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-1 items-center space-x-3">
                                      <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-100">
                                        <span className="text-xs font-medium">
                                          {isEmailAction(step.action) ? "📧" : "📱"}
                                        </span>
                                      </div>
                                      <Select
                                        value={step.action}
                                        onValueChange={(value: WorkflowActions) =>
                                          updateAction(step.id, "action", value)
                                        }
                                        disabled={readOnly}>
                                        <SelectTrigger className="w-fit">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-default">
                                          {actionOptions?.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                              {option.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {actions.length > 1 && !readOnly && (
                                        <Button
                                          color="destructive"
                                          size="sm"
                                          onClick={() => removeAction(step.id)}
                                          className="p-2">
                                          <Icon name="trash-2" className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>

                                  <CollapsibleContent className="mt-4">
                                    <div className="space-y-4">
                                      {/* Phone Number Input for SMS/WhatsApp specific actions */}
                                      {(step.action === WorkflowActions.SMS_NUMBER ||
                                        step.action === WorkflowActions.WHATSAPP_NUMBER) && (
                                        <div className="bg-default rounded-md">
                                          <Label className="pt-4">
                                            {step.action === WorkflowActions.WHATSAPP_NUMBER
                                              ? "WhatsApp Number"
                                              : "Phone Number"}
                                          </Label>
                                          <div className="block sm:flex">
                                            <Controller
                                              name={`steps.${step.stepNumber - 1}.sendTo`}
                                              control={form.control}
                                              render={({ field: { value, onChange } }) => (
                                                <PhoneInput
                                                  placeholder={t("phone_number")}
                                                  className="min-w-fit sm:rounded-r-none sm:rounded-bl-md sm:rounded-tl-md"
                                                  required
                                                  disabled={readOnly}
                                                  value={value || ""}
                                                  onChange={(val) => {
                                                    const isAlreadyVerified = !!verifiedNumbersData?.find(
                                                      (number) =>
                                                        number.phoneNumber?.replace(/\s/g, "") ===
                                                        val?.replace(/\s/g, "")
                                                    );
                                                    setNumberVerificationStatus((prev) => ({
                                                      ...prev,
                                                      [stepId]: isAlreadyVerified,
                                                    }));
                                                    setOtpSentForPhone((prev) => ({
                                                      ...prev,
                                                      [stepId]: false,
                                                    }));
                                                    setVerificationCodes((prev) => ({
                                                      ...prev,
                                                      [stepId]: "",
                                                    }));
                                                    updateAction(step.id, "sendTo", val);
                                                    onChange(val);
                                                  }}
                                                />
                                              )}
                                            />
                                            <Button
                                              color="secondary"
                                              disabled={isNumberVerified || readOnly || !isPhoneValid}
                                              className={cn(
                                                "-ml-[3px] h-[40px] min-w-fit sm:block sm:rounded-bl-none sm:rounded-tl-none",
                                                isNumberVerified ? "hidden" : "mt-3 sm:mt-0"
                                              )}
                                              onClick={() => handleSendVerificationCode(step)}>
                                              {t("send_code")}
                                            </Button>
                                          </div>

                                          {isNumberVerified ? (
                                            <div className="mt-1">
                                              <Badge variant="success">{t("number_verified")}</Badge>
                                            </div>
                                          ) : (
                                            !readOnly &&
                                            step.sendTo &&
                                            isPhoneValid &&
                                            isPhoneOtpSent && (
                                              <>
                                                <div className="mt-3 flex">
                                                  <Input
                                                    className="h-[36px] rounded-r-none border-r-transparent"
                                                    placeholder="Verification code"
                                                    disabled={readOnly}
                                                    value={verificationCode}
                                                    onChange={(e) => {
                                                      setVerificationCodes((prev) => ({
                                                        ...prev,
                                                        [stepId]: e.target.value,
                                                      }));
                                                    }}
                                                    required
                                                  />
                                                  <Button
                                                    color="secondary"
                                                    className="-ml-[3px] h-[36px] min-w-fit py-0 sm:block sm:rounded-bl-none sm:rounded-tl-none"
                                                    disabled={verifyPhoneNumberMutation.isPending || readOnly}
                                                    onClick={() => handleVerifyPhoneNumber(step)}>
                                                    {t("verify")}
                                                  </Button>
                                                </div>
                                              </>
                                            )
                                          )}
                                        </div>
                                      )}

                                      {/* Email Address Input for EMAIL_ADDRESS action */}
                                      {step.action === WorkflowActions.EMAIL_ADDRESS && (
                                        <div className="bg-default rounded-md">
                                          <Label>Email address</Label>
                                          <div className="block sm:flex">
                                            <Input
                                              type="email"
                                              required
                                              className="h-10 min-w-fit sm:rounded-r-none sm:rounded-bl-md sm:rounded-tl-md"
                                              placeholder="recipient@example.com"
                                              value={step.sendTo || ""}
                                              disabled={readOnly}
                                              onChange={(e) => {
                                                const isAlreadyVerified = !!verifiedEmailsData?.find(
                                                  (email) => email === e.target.value
                                                );
                                                setEmailVerificationStatus((prev) => ({
                                                  ...prev,
                                                  [stepId]: isAlreadyVerified,
                                                }));
                                                //  Clear OTP sent status when email changes
                                                setOtpSentForEmail((prev) => ({
                                                  ...prev,
                                                  [stepId]: false,
                                                }));
                                                setVerificationCodes((prev) => ({
                                                  ...prev,
                                                  [stepId]: "",
                                                }));
                                                updateAction(step.id, "sendTo", e.target.value);
                                              }}
                                            />
                                            <Button
                                              color="secondary"
                                              disabled={isEmailVerified || readOnly || !isEmailValid}
                                              className={cn(
                                                "-ml-[3px] h-[40px] min-w-fit sm:block sm:rounded-bl-none sm:rounded-tl-none",
                                                isEmailVerified ? "hidden" : "mt-3 sm:mt-0"
                                              )}
                                              onClick={() => handleSendEmailVerification(step)}>
                                              {t("send_code")}
                                            </Button>
                                          </div>

                                          {isEmailVerified ? (
                                            <div className="mt-1">
                                              <Badge variant="success">{t("email_verified")}</Badge>
                                            </div>
                                          ) : (
                                            !readOnly &&
                                            step.sendTo &&
                                            isEmailValid &&
                                            isEmailOtpSent && (
                                              <>
                                                <div className="mt-3 flex">
                                                  <Input
                                                    className="h-[36px] rounded-r-none border-r-transparent"
                                                    placeholder="Verification code"
                                                    disabled={readOnly}
                                                    value={verificationCode}
                                                    onChange={(e) => {
                                                      setVerificationCodes((prev) => ({
                                                        ...prev,
                                                        [stepId]: e.target.value,
                                                      }));
                                                    }}
                                                    required
                                                  />
                                                  <Button
                                                    color="secondary"
                                                    className="-ml-[3px] h-[36px] min-w-fit py-0 sm:block sm:rounded-bl-none sm:rounded-tl-none"
                                                    disabled={verifyEmailCodeMutation.isPending || readOnly}
                                                    onClick={() => handleVerifyEmail(step)}>
                                                    {t("verify")}
                                                  </Button>
                                                </div>
                                              </>
                                            )
                                          )}
                                        </div>
                                      )}

                                      {/* Sender Configuration for SMS (not WhatsApp) */}
                                      {isSMSAction(step.action) && (
                                        <div className="bg-default rounded-md">
                                          <div className="pt-4">
                                            <div className="flex items-center">
                                              <Label>{t("sender_id")}</Label>
                                              <Icon
                                                name="info"
                                                className="mb-2 ml-2 mr-1 mt-0.5 h-4 w-4 text-gray-500"
                                              />
                                            </div>
                                            <Input
                                              type="text"
                                              placeholder={SENDER_ID}
                                              disabled={readOnly}
                                              maxLength={11}
                                              value={step.sender}
                                              onChange={(e) =>
                                                updateAction(step.id, "sender", e.target.value)
                                              }
                                            />
                                          </div>
                                        </div>
                                      )}

                                      {/* Sender Name for WhatsApp and Email */}
                                      {(isWhatsappAction(step.action) || isEmailAction(step.action)) && (
                                        <div className="bg-default rounded-md">
                                          <div className="pt-4">
                                            <Label>
                                              {isWhatsappAction(step.action)
                                                ? t("sender_name")
                                                : "Sender name"}
                                            </Label>
                                            <Input
                                              type="text"
                                              disabled={readOnly}
                                              placeholder={SENDER_NAME}
                                              value={step.senderName || ""}
                                              onChange={(e) =>
                                                updateAction(step.id, "senderName", e.target.value)
                                              }
                                            />
                                          </div>
                                        </div>
                                      )}

                                      {/* Number Required Checkbox for SMS/WhatsApp attendee actions */}
                                      {(step.action === WorkflowActions.SMS_ATTENDEE ||
                                        step.action === WorkflowActions.WHATSAPP_ATTENDEE) && (
                                        <div className="mt-2">
                                          <Controller
                                            name={`steps.${step.stepNumber - 1}.numberRequired`}
                                            control={form.control}
                                            render={() => (
                                              <div className="flex items-center space-x-2">
                                                <Checkbox
                                                  disabled={readOnly}
                                                  checked={step.numberRequired || false}
                                                  onCheckedChange={(checked) =>
                                                    updateAction(step.id, "numberRequired", checked)
                                                  }
                                                />
                                                <Label className="text-sm">
                                                  {t("make_phone_number_required")}
                                                </Label>
                                              </div>
                                            )}
                                          />
                                        </div>
                                      )}

                                      {/* Template Selection */}
                                      <div className="mt-5">
                                        <Label>Message template</Label>
                                        <Select
                                          value={step.template}
                                          onValueChange={(value: WorkflowTemplates) =>
                                            updateAction(step.id, "template", value)
                                          }
                                          disabled={readOnly}>
                                          <SelectTrigger className="mt-1">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-default">
                                            {templateOptions.map((option) => (
                                              <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {/* Message Content */}
                                      <div className="bg-default rounded-md">
                                        {/* Email Subject for Email Actions */}
                                        {isEmailAction(step.action) && (
                                          <div className="mb-6">
                                            <div className="flex items-center">
                                              <Label className={cn("flex-none", readOnly ? "mb-2" : "mb-0")}>
                                                {t("email_subject")}
                                              </Label>
                                              {!readOnly && (
                                                <div className="flex-grow text-right">
                                                  <VariableDropdown
                                                    onSelect={(variable) =>
                                                      insertVariable(step.id, "emailSubject", variable)
                                                    }
                                                  />
                                                </div>
                                              )}
                                            </div>
                                            <TextArea
                                              rows={2}
                                              disabled={readOnly}
                                              className="my-0 focus:ring-transparent"
                                              required
                                              value={step.emailSubject || ""}
                                              onChange={(e) =>
                                                updateAction(step.id, "emailSubject", e.target.value)
                                              }
                                            />
                                          </div>
                                        )}

                                        {/* Message Body */}
                                        <div className="mb-2 flex items-center pb-1">
                                          <Label className="mb-0 flex-none">
                                            {isEmailAction(step.action) ? t("email_body") : t("text_message")}
                                          </Label>
                                        </div>

                                        {/* Enhanced Editor component with template and step-specific key */}
                                        <div className="rounded-md border">
                                          <Editor
                                            key={`editor-${step.id}-${stepTemplateUpdate}-${step.template}`}
                                            getText={() => step.reminderBody || ""}
                                            setText={(text: string) => {
                                              updateAction(step.id, "reminderBody", text);
                                            }}
                                            variables={DYNAMIC_TEXT_VARIABLES}
                                            addVariableButtonTop={isSMSAction(step.action)}
                                            height="200px"
                                            // updateTemplate={!!stepTemplateUpdate}
                                            // firstRender={firstRender}
                                            // setFirstRender={setFirstRender}
                                            editable={
                                              !readOnly &&
                                              !isWhatsappAction(step.action) &&
                                              (true || isSMSAction(step.action)) // Assume team plan for now
                                            }
                                            excludedToolbarItems={
                                              !isSMSAction(step.action)
                                                ? []
                                                : ["blockType", "bold", "italic", "link"]
                                            }
                                            plainText={isSMSAction(step.action)}
                                          />
                                        </div>

                                        {/* Include Calendar Event for Email Actions */}
                                        {isEmailAction(step.action) && (
                                          <div className="mt-2">
                                            <Controller
                                              name={`steps.${step.stepNumber - 1}.includeCalendarEvent`}
                                              control={form.control}
                                              render={() => (
                                                <div className="flex items-center space-x-2">
                                                  <Checkbox
                                                    disabled={readOnly}
                                                    checked={step.includeCalendarEvent || false}
                                                    onCheckedChange={(checked) =>
                                                      updateAction(step.id, "includeCalendarEvent", checked)
                                                    }
                                                  />
                                                  <Label className="text-sm">
                                                    {t("include_calendar_event")}
                                                  </Label>
                                                </div>
                                              )}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            </Card>
                          );
                        })}

                        {!readOnly && (
                          <Button
                            color="secondary"
                            onClick={addAction}
                            className="w-full border-2 border-dashed">
                            <Icon name="plus" className="mr-2 h-4 w-4" />
                            Add action
                          </Button>
                        )}

                        <div className="flex justify-end pt-4">
                          <div className="flex space-x-2">
                            <Button
                              color="secondary"
                              onClick={() => router.push("/workflows")}
                              disabled={updateMutation.isPending}>
                              Cancel
                            </Button>
                            {!readOnly && (
                              <Button
                                onClick={handleSaveWorkflow}
                                className="px-8"
                                loading={updateMutation.isPending}>
                                Save Workflow
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Read-only indicator */}
                {readOnly && (
                  <div className="rounded-md bg-yellow-50">
                    <div className="flex">
                      <Icon name="info" className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Read-only Access</h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>
                            You have read-only access to this workflow. Contact a team admin to make changes.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </ShellMain>
    </Shell>
  );
};
