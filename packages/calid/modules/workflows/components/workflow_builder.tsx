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
import { triggerToast } from "@calid/features/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";

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
import { Select } from "@calcom/ui/components/form";

import { TRPCError } from "@trpc/server";

import { DYNAMIC_TEXT_VARIABLES, META_DYNAMIC_TEXT_VARIABLES } from "../config/constants";
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
// Add these imports to your WorkflowBuilder component
import { type VariableMapping } from "./utils";
import { VariableDocsDialog } from "./variable_docs_dialog";
import { WorkflowBuilderSkeleton } from "./workflow_builder_skeleton";
import { WorkflowDeleteDialog } from "./workflow_delete_dialog";

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
  metaTemplatePhoneNumberId?: string | null;
  metaTemplateName?: string | null;
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
  workflowId?: number;
  builderTemplate?: WorkflowBuilderTemplateFields;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ workflowId, builderTemplate }) => {
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
    defaultValues: {
      steps: [],
    },
  });

  const validateWhatsAppTemplateVariables = useCallback((body: string): string | null => {
    if (!body) return null;

    // Extract all variables in format {{variable_name}}
    const variableRegex = /\{\{([A-Z0-9a-z_]+)\}\}/g;
    const matches = Array.from(body.matchAll(variableRegex));

    for (const match of matches) {
      const variableName = match[1];
      if (!META_DYNAMIC_TEXT_VARIABLES.includes(variableName)) {
        return variableName;
      }
    }

    return null;
  }, []);

  // Watch steps from form - THIS REPLACES THE ACTIONS STATE
  const steps = useWatch({
    control: form.control,
    name: "steps",
    defaultValue: [],
  }) as WorkflowStep[];

  // Real data states
  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);
  const [isAllDataLoaded, setIsAllDataLoaded] = useState(false);
  const [isMixedEventType, setIsMixedEventType] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isVariableDocsOpen, setIsVariableDocsOpen] = useState(false);

  // Add ref to prevent infinite loops
  const dataLoadedRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  // Get workflow data from tRPC
  const {
    data: workflowData,
    isError,
    error,
    isPending: isPendingWorkflow,
  } = trpc.viewer.workflows.calid_get.useQuery(
    { id: workflowId },
    {
      enabled: !!workflowId,
    }
  );

  // Add tRPC hooks for WhatsApp
  const { data: whatsAppPhones } = trpc.viewer.workflows.getWhatsAppPhoneNumbers.useQuery(
    workflowData?.calIdTeamId ? { calIdTeamId: workflowData.calIdTeamId } : {},
    { enabled: !!isAllDataLoaded }
  );

  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<string | null>(null);

  const [invalidVariables, setInvalidVariables] = useState<{ [stepId: string]: string | null }>({});

  const { data: whatsAppTemplates } = trpc.viewer.workflows.getWhatsAppTemplates.useQuery(
    {
      phoneNumberId: selectedPhoneNumberId || "",
      ...(workflowData?.calIdTeamId ? { calIdTeamId: workflowData.calIdTeamId } : {}),
    },
    { enabled: !!selectedPhoneNumberId }
  );

  // Get verified numbers and emails
  let { data: verifiedNumbersData } = trpc.viewer.workflows.calid_getVerifiedNumbers.useQuery(
    workflowData?.calIdTeamId ? { calIdTeamId: workflowData?.calIdTeamId } : {}
  );

  verifiedNumbersData ??= [];

  let { data: verifiedEmailsData } = trpc.viewer.workflows.calid_getVerifiedEmails.useQuery(
    workflowData?.calIdTeamId
      ? {
          calIdTeamId: workflowData?.calIdTeamId,
        }
      : {}
  );

  verifiedEmailsData ??= [];

  // Get workflow action options
  const { data: actionOptions } = trpc.viewer.workflows.calid_getWorkflowActionOptions.useQuery();

  // Get time format
  const timeFormat = user ? getTimeFormatStringFromUserTimeFormat(user.timeFormat) : TimeFormat.TWELVE_HOUR;

  // Get event type options
  const isOrg = false;
  const teamId = workflowData?.calIdTeamId ?? undefined;

  const { data: eventTypeData, isPending: isPendingEventTypes } =
    trpc.viewer.eventTypes.getCalIdTeamAndEventTypeOptions.useQuery(
      { teamId, isOrg },
      { enabled: !isPendingWorkflow }
    );

  const prevEventTypeDataRef = useRef();
  useEffect(() => {
    prevEventTypeDataRef.current = eventTypeData;
  }, [eventTypeData]);

  // Process event type options
  const allEventTypeOptions = useMemo(() => {
    let options = [...(eventTypeData?.eventTypeOptions ?? [])];

    if (!teamId && isMixedEventType && isInitialLoadRef.current) {
      const distinctEventTypes = new Set(options.map((opt) => opt.value));
      const additionalOptions = selectedOptions.filter((opt) => !distinctEventTypes.has(opt.value));
      options = [...options, ...additionalOptions];
    }

    return options;
  }, [eventTypeData, teamId, isMixedEventType, selectedOptions]);

  useEffect(() => {
    if (eventTypeData?.eventTypeOptions) {
      dataLoadedRef.current = false;
      setFormData();
    }
  }, [eventTypeData?.eventTypeOptions]);

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
  const [otpSentForPhone, setOtpSentForPhone] = useState<{ [stepId: string]: boolean }>({});
  const [otpSentForEmail, setOtpSentForEmail] = useState<{ [stepId: string]: boolean }>({});

  // Template update tracker
  const [updateTemplate, setUpdateTemplate] = useState<{ [stepId: string]: number }>({});

  // Get trigger and template options
  const triggerOptions = getWorkflowTriggerOptions(t);

  // Verification mutations
  const sendVerificationCodeMutation = trpc.viewer.workflows.calid_sendVerificationCode.useMutation({
    onSuccess: async (data, variables) => {
      triggerToast(t("verification_code_sent"), "success");
      if (variables?.phoneNumber) {
        steps.forEach((step) => {
          if (step.sendTo === variables.phoneNumber) {
            setOtpSentForPhone((prev) => ({ ...prev, [step.id.toString()]: true }));
          }
        });
      }
    },
    onError: async (error) => {
      triggerToast(error.message, "error");
    },
  });

  const verifyPhoneNumberMutation = trpc.viewer.workflows.calid_verifyPhoneNumber.useMutation({
    onSuccess: async (isVerified, variables) => {
      triggerToast(isVerified ? t("verified_successfully") : t("wrong_code"), "success");

      if (isVerified && variables?.phoneNumber) {
        setNumberVerificationStatus((prev) => {
          const newStatus = { ...prev };
          steps.forEach((step) => {
            if (step.sendTo === variables.phoneNumber) {
              newStatus[step.id.toString()] = true;
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
        triggerToast(message, "error");
      }
    },
  });

  const [syncingTemplates, setSyncingTemplates] = useState(false);

  const syncTemplatesMutation = trpc.viewer.appWhatsappBusiness.syncTemplates.useMutation({
    onSuccess(data, variables) {
      setSyncingTemplates(false);
      triggerToast(t("successfully_synced"), "success");
    },
    onError: (e) => {
      setSyncingTemplates(false);
      console.log("error: ", e);
      if (e instanceof Error) {
        triggerToast(`${e.message}`, "error");
      } else {
        triggerToast(`${t("sync_failed")}`, "error");
      }
    },
  });

  const handleSyncTemplates = useCallback(() => {
    setSyncingTemplates(true);
    if (selectedPhoneNumberId) {
      syncTemplatesMutation.mutate({
        phoneNumberId: selectedPhoneNumberId,
      });
    } else {
      setSyncingTemplates(false);
      triggerToast("Select a phone number", "error");
    }
  }, [selectedPhoneNumberId, syncTemplatesMutation]);

  const sendEmailVerificationCodeMutation = trpc.viewer.auth.sendVerifyEmailCode.useMutation({
    onSuccess(data, variables) {
      triggerToast(t("email_sent"), "success");
      if (variables?.email) {
        steps.forEach((step) => {
          if (step.sendTo === variables.email) {
            setOtpSentForEmail((prev) => ({ ...prev, [step.id.toString()]: true }));
          }
        });
      }
    },
    onError: () => {
      triggerToast(t("email_not_sent"), "error");
    },
  });

  const verifyEmailCodeMutation = trpc.viewer.workflows.calid_verifyEmailCode.useMutation({
    onSuccess: (isVerified, variables) => {
      triggerToast(isVerified ? t("verified_successfully") : t("wrong_code"), "success");

      if (isVerified && variables?.email) {
        setEmailVerificationStatus((prev) => {
          const newStatus = { ...prev };
          steps.forEach((step) => {
            if (step.sendTo === variables.email) {
              newStatus[step.id.toString()] = true;
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
        triggerToast(t("code_provided_invalid"), "error");
      }
    },
  });

  // Update mutation
  const updateMutation = trpc.viewer.workflows.calid_update.useMutation({
    onSuccess: async ({ workflow }) => {
      if (workflow) {
        utils.viewer.workflows.calid_get.setData({ id: workflow.id }, workflow);
        triggerToast(
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
        triggerToast(message, "error");
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

  // Helper function for WhatsApp actions
  const isWhatsappAction = (action: WorkflowActions) =>
    action === WorkflowActions.WHATSAPP_ATTENDEE || action === WorkflowActions.WHATSAPP_NUMBER;

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
        const processedSteps =
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

        processedSteps.forEach((step) => {
          if (isWhatsappAction(step.action) && step.metaTemplatePhoneNumberId) {
            setSelectedPhoneNumberId(step.metaTemplatePhoneNumberId);
          }
        });

        // Use form.reset to set all values at once

        form.reset({
          name: workflowDataInput.name,
          steps: processedSteps,
          trigger: workflowDataInput.trigger,
          time: workflowDataInput.time || undefined,
          timeUnit: workflowDataInput.timeUnit || undefined,
          activeOn: activeOn || [],
          selectAll: workflowDataInput.isActiveOnAll ?? false,
        });

        // Update UI state
        setWorkflowName(workflowDataInput.name);
        setTrigger(workflowDataInput.trigger);
        setCustomTime(String(workflowDataInput.time || ""));
        setTimeUnit(workflowDataInput.timeUnit || "HOUR");
        setTriggerTiming(workflowDataInput.time ? "custom" : "immediately");

        // Initialize verification status
        const numberStatus: { [key: string]: boolean } = {};
        const emailStatus: { [key: string]: boolean } = {};

        processedSteps.forEach((step) => {
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

        if (workflowDataInput.name) {
          setShowEventTypeSection(true);
        }

        if (activeOn.length > 0) {
          setShowTriggerSection(true);
          setShowActionsSection(true);
        }

        setIsAllDataLoaded(true);
        isInitialLoadRef.current = false;
      }
    },
    [
      form,
      isOrg,
      teamOptions,
      allEventTypeOptions,
      i18n.language,
      t,
      getNumberVerificationStatus,
      getEmailVerificationStatus,
    ]
  );

  // Watch the activeOn field
  const activeOnValue = form.watch("activeOn");

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
    if (selectedOptions?.length > 0) {
      setShowTriggerSection(true);
      setShowActionsSection(true);
    }
  }, [selectedOptions, isPendingEventTypes]);

  // useEffect(() => {
  //   if (trigger && (triggerTiming === "immediately" || (triggerTiming === "custom" && customTime))) {
  //     setShowActionsSection(true);
  //   }
  // }, [trigger, triggerTiming, customTime]);

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
    [allEventTypeOptions, form, isPendingEventTypes]
  );

  const getNewStep = useCallback(
    (stepNumber: number, actionType: WorkflowActions, template: WorkflowTemplates): WorkflowStep => {
      const newStep: WorkflowStep = {
        id: -Date.now(),
        stepNumber: stepNumber,
        action: actionType,
        workflowId: workflowId!,
        sendTo: null,
        reminderBody: null,
        emailSubject: null,
        template: template,
        numberRequired: false,
        sender: SENDER_ID,
        senderName: SENDER_NAME,
        numberVerificationPending: false,
        includeCalendarEvent: false,
        verifiedAt: null,
      };

      // Set default template content
      const templateBody = getTemplateBodyForAction({
        action: newStep.action,
        locale: i18n.language,
        t,
        template: newStep.template,
        timeFormat,
      });
      newStep.reminderBody = templateBody;

      if (shouldScheduleEmailReminder(newStep.action)) {
        newStep.emailSubject = emailReminderTemplate({
          isEditingMode: true,
          locale: i18n.language,
          action: newStep.action,
          timeFormat,
        }).emailSubject;
      }

      return newStep;
    }
  );

  useEffect(() => {
    if (builderTemplate) {
      const newStep = getNewStep(0, builderTemplate.action, builderTemplate.template);

      form.setValue("steps", [...currentSteps, newStep], { shouldDirty: true });

      triggerTemplateUpdate(newStep.id);
    }
  }, [builderTemplate]);

  const addAction = useCallback(() => {
    const currentSteps = form.getValues("steps") || [];

    const newStep = getNewStep(
      currentSteps.length + 1,
      WorkflowActions.EMAIL_ATTENDEE,
      WorkflowTemplates.REMINDER
    );

    form.setValue("steps", [...currentSteps, newStep], { shouldDirty: true });

    if (newStep.id) {
      triggerTemplateUpdate(newStep.id);
    }
  }, [workflowId, i18n.language, t, timeFormat, form, triggerTemplateUpdate]);

  const removeAction = useCallback(
    (stepId: number) => {
      const currentSteps = form.getValues("steps") || [];
      const filtered = currentSteps.filter((step) => step.id !== stepId);

      // Update step numbers
      const reordered = filtered.map((step, index) => ({
        ...step,
        stepNumber: index + 1,
      }));

      form.setValue("steps", reordered, { shouldDirty: true });

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
      const currentSteps = form.getValues("steps") || [];

      // // Handle action type changes
      // if (field === "action") {
      //   const newAction = value as WorkflowActions;
      //   // ... rest of your existing action change logic
      // }

      const updated = currentSteps.map((step) => {
        if (step.id === stepId) {
          const updatedStep = { ...step, [field]: value };

          if (field === "metaTemplateName" && isWhatsappAction(step.action)) {
            const selectedTemplate = whatsAppTemplates?.find((t) => t.name === value);

            if (selectedTemplate) {
              // Check if template needs variable mapping

              // Auto-fill reminderBody with template body (optional)
              const bodyComponent = selectedTemplate.components.find((c: any) => c.type === "BODY");
              if (bodyComponent?.text) {
                updatedStep.reminderBody = bodyComponent.text;

                // Validate the template body
                const invalidVar = validateWhatsAppTemplateVariables(bodyComponent.text);
                setInvalidVariables((prev) => ({
                  ...prev,
                  [stepId.toString()]: invalidVar,
                }));
              }

              triggerTemplateUpdate(stepId);
            }
          }

          // Handle action type changes
          if (field === "action") {
            const newAction = value as WorkflowActions;

            // Reset WhatsApp-specific fields when changing action
            if (!isWhatsappAction(newAction)) {
              updatedStep.metaTemplateName = null;
              updatedStep.metaTemplatePhoneNumberId = null;
            }

            // Get fresh template content and completely replace reminderBody
            const freshTemplate = getTemplateBodyForAction({
              action: newAction,
              locale: i18n.language,
              t,
              template: WorkflowTemplates.REMINDER,
              timeFormat,
            });
            updatedStep.reminderBody = freshTemplate;
            updatedStep.template = WorkflowTemplates.REMINDER;

            // Reset sender and other fields
            if (isSMSAction(newAction)) {
              updatedStep.sender = SENDER_ID;
              updatedStep.senderName = SENDER_ID;
            } else if (isWhatsappAction(newAction)) {
              updatedStep.sender = "";
              updatedStep.senderName = SENDER_NAME;
            } else {
              updatedStep.sender = SENDER_ID;
              updatedStep.senderName = SENDER_NAME;
            }

            // Reset sendTo
            updatedStep.sendTo = null;

            // Reset OTP/verification states
            const stepIdStr = stepId.toString();
            setOtpSentForPhone((prev) => ({ ...prev, [stepIdStr]: false }));
            setOtpSentForEmail((prev) => ({ ...prev, [stepIdStr]: false }));
            setVerificationCodes((prev) => ({ ...prev, [stepIdStr]: "" }));

            // Set email subject if action is email reminder
            if (shouldScheduleEmailReminder(newAction)) {
              updatedStep.emailSubject = emailReminderTemplate({
                isEditingMode: true,
                locale: i18n.language,
                action: newAction,
                timeFormat,
              }).emailSubject;
            }

            triggerTemplateUpdate(stepId);
          }

          // Handle template changes
          if (field === "template") {
            const newTemplate = value as WorkflowTemplates;
            const actionType = updatedStep.action;

            const freshTemplateBody = getTemplateBodyForAction({
              action: actionType,
              locale: i18n.language,
              t,
              template: newTemplate,
              timeFormat,
            });

            // Always replace (prevent duplication)
            updatedStep.reminderBody = freshTemplateBody;

            // Update email subject depending on template
            if (shouldScheduleEmailReminder(actionType)) {
              if (newTemplate === WorkflowTemplates.REMINDER) {
                updatedStep.emailSubject = emailReminderTemplate({
                  isEditingMode: true,
                  locale: i18n.language,
                  action: actionType,
                  timeFormat,
                }).emailSubject;
              } else if (newTemplate === WorkflowTemplates.RATING) {
                updatedStep.emailSubject = emailRatingTemplate({
                  isEditingMode: true,
                  locale: i18n.language,
                  action: actionType,
                  timeFormat,
                }).emailSubject;
              } else if (newTemplate === WorkflowTemplates.THANKYOU) {
                updatedStep.emailSubject = emailThankYouTemplate({
                  isEditingMode: true,
                  timeFormat,
                }).emailSubject;
              }
            }

            triggerTemplateUpdate(stepId);
          }

          return updatedStep;
        }
        return step;
      });

      form.setValue("steps", updated, { shouldDirty: true });
    },
    [form, i18n.language, t, timeFormat, triggerTemplateUpdate, whatsAppTemplates]
  );

  const toggleActionExpanded = useCallback((stepId: number) => {
    // This is just for UI state, we can track it separately if needed
    // For now, all actions will be expanded
  }, []);

  const insertVariable = useCallback(
    (stepId: number, field: string, variable: string) => {
      const currentSteps = form.getValues("steps") || [];
      const stepIndex = currentSteps.findIndex((s) => s.id === stepId);

      if (stepIndex !== -1) {
        const step = currentSteps[stepIndex];
        const currentValue = (step[field as keyof WorkflowStep] as string) || "";
        const newValue = `${currentValue}{${variable.toUpperCase().replace(/ /g, "_")}}`;

        form.setValue(`steps.${stepIndex}.${field}` as any, newValue, { shouldDirty: true });
      }
    },
    [form]
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
    let hasMappingErrors = false;
    let hasInvalidVariables = false; // Add this

    // Get the latest form values - this now has the correct HTML
    const formValues = form.getValues();
    const formSteps = formValues.steps || [];

    formSteps.forEach((step) => {
      const stepId = step.id.toString();
      if (isWhatsappAction(step.action) && invalidVariables[stepId]) {
        hasInvalidVariables = true;
        triggerToast(`Invalid variable {{${invalidVariables[stepId]}}} in WhatsApp template`, "error");
      }
    });

    // Validate and prepare steps
    const validatedSteps = formSteps.map((step, index) => {
      const processedStep = {
        ...step,
        stepNumber: index + 1,
      };

      if (isWhatsappAction(processedStep.action) && processedStep.metaTemplateName) {
        const selectedTemplate = whatsAppTemplates?.find((t) => t.id === processedStep.metaTemplateName);
      }

      // Validation logic - ONLY for checking, don't modify original
      const strippedHtml = processedStep.reminderBody?.replace(/<[^>]+>/g, "") || "";
      const isBodyEmpty = !isSMSOrWhatsappAction(processedStep.action) && strippedHtml.length <= 1;

      if (isBodyEmpty) {
        isEmpty = true;
        triggerToast(t("fill_this_field"), "error");
      }

      // Translate variables back to English
      if (processedStep.reminderBody) {
        processedStep.reminderBody = translateVariablesToEnglish(processedStep.reminderBody, {
          locale: i18n.language,
          t,
        });
      }
      if (processedStep.emailSubject) {
        processedStep.emailSubject = translateVariablesToEnglish(processedStep.emailSubject, {
          locale: i18n.language,
          t,
        });
      }

      // Check verification for SMS/WhatsApp actions
      if (
        (processedStep.action === WorkflowActions.SMS_NUMBER ||
          processedStep.action === WorkflowActions.WHATSAPP_NUMBER) &&
        !numberVerificationStatus[processedStep.id] &&
        !verifiedNumbersData?.find((verifiedNumber) => verifiedNumber.phoneNumber === processedStep.sendTo)
      ) {
        isVerified = false;
        triggerToast(t("not_verified"), "error");
      }

      if (
        processedStep.action === WorkflowActions.EMAIL_ADDRESS &&
        !verifiedEmailsData?.find((verifiedEmail) => verifiedEmail === processedStep.sendTo)
      ) {
        isVerified = false;
        triggerToast(t("not_verified"), "error");
      }

      return processedStep;
    });

    console.log("Validated steps: ", validatedSteps);

    if (!isEmpty && isVerified && workflowId && !hasMappingErrors && !hasInvalidVariables) {
      if (selectedOptions.length > 0) {
        activeOnIds = selectedOptions
          .filter((option) => option.value !== "all")
          .map((option) => parseInt(option.value, 10));
      }

      console.log("Validated steps:", validatedSteps);

      updateMutation.mutate({
        id: workflowId,
        name: workflowName,
        activeOn: activeOnIds,
        steps: validatedSteps,
        trigger: trigger as WorkflowTriggerEvents,
        time: triggerTiming === "custom" ? parseInt(customTime) || null : null,
        timeUnit: triggerTiming === "custom" ? timeUnit : null,
        isActiveOnAll: false,
      });
    }
  }, [
    invalidVariables,
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
    numberVerificationStatus,
    whatsAppTemplates,
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

  // Helper function to verify phone number
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

  // Helper function to verify email
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

  // Handle successful workflow deletion
  const handleDeleteSuccess = useCallback(async () => {
    await router.push("/workflows");
  }, [router]);

  // Loading and error states
  const isPending = isPendingWorkflow || isPendingEventTypes;

  if (isPending) {
    return (
      <Shell withoutMain backPath="/workflows">
        <ShellMain
          backPath="/workflows"
          title={t("untitled")}
          subtitle={t("workflows_edit_description")}
          heading={
            <div className="flex">
              <div className="text-muted">{t("untitled")}</div>
            </div>
          }
          CTA={<div />}>
          <WorkflowBuilderSkeleton />;
        </ShellMain>
      </Shell>
    );
  }

  return (
    <Shell withoutMain backPath="/workflows">
      <ShellMain
        backPath="/workflows"
        title={workflowData && workflowData.name ? workflowData.name : "Untitled"}
        subtitle={t("workflows_edit_description")}
        CTA={
          !readOnly && (
            <div className="mr-2 flex gap-2">
              {workflowId && (
                <Button
                  data-testid="delete-workflow"
                  color="destructive"
                  variant="icon"
                  StartIcon="trash-2"
                  onClick={() => setIsDeleteDialogOpen(true)}
                />
              )}
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
                {workflowData && workflowData.name ? workflowData.name : t("untitled")}
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
        {isError ? (
          <Alert severity="error" title="Something went wrong" message={error?.message ?? ""} />
        ) : (
          <div className="bg-card flex justify-center p-0 md:p-14">
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
                      <div className="slideInTop">
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
                  <div className="slideInTop">
                    <Card className="slideInTop">
                      <CardHeader>
                        <CardTitle>When this happens</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Select
                            value={triggerOptions.find((option) => option.value === trigger) || null}
                            onChange={(option) => setTrigger((option?.value as WorkflowTriggerEvents) || "")}
                            options={triggerOptions}
                            placeholder="Select an occurrence"
                            isDisabled={readOnly}
                            className="mt-2"
                          />
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
                                      value={
                                        [
                                          { value: "MINUTE", label: "minutes" },
                                          { value: "HOUR", label: "hours" },
                                        ].find((option) => option.value === timeUnit) || null
                                      }
                                      onChange={(option) =>
                                        setTimeUnit((option?.value as TimeUnit) || "HOUR")
                                      }
                                      options={[
                                        { value: "MINUTE", label: "minutes" },
                                        { value: "HOUR", label: "hours" },
                                      ]}
                                      isDisabled={readOnly}
                                      className="w-24"
                                    />
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

                {/* Actions Section */}
                {showActionsSection && (
                  <div className="slideInTop">
                    <Card className="slideInTop">
                      <CardHeader>
                        <CardTitle>Do this</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {steps.map((step) => {
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
                                          {isEmailAction(step.action) ? (
                                            <Icon name="mail" />
                                          ) : (
                                            <Icon name="phone" />
                                          )}
                                        </span>
                                      </div>
                                      <Select
                                        value={
                                          actionOptions?.find((option) => option.value === step.action) ||
                                          null
                                        }
                                        onChange={(option) =>
                                          updateAction(step.id, "action", option?.value as WorkflowActions)
                                        }
                                        options={actionOptions || []}
                                        isDisabled={readOnly}
                                        className="w-fit"
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {steps.length > 1 && !readOnly && (
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

                                      {/* WhatsApp Phone Number Selector */}
                                      {isWhatsappAction(step.action) && (
                                        <div className="bg-default mt-4 rounded-md">
                                          <div className="flex items-center justify-between">
                                            <Label>WhatsApp Business Phone Number</Label>
                                          </div>
                                          <Select
                                            value={
                                              whatsAppPhones?.find(
                                                (phone) => phone.id === step.metaTemplatePhoneNumberId
                                              )
                                                ? {
                                                    value: step.metaTemplatePhoneNumberId || "",
                                                    label: step.metaTemplatePhoneNumberId
                                                      ? whatsAppPhones?.find(
                                                          (p) => p.id === step.metaTemplatePhoneNumberId
                                                        )?.phoneNumber || "Unknown"
                                                      : "Default",
                                                  }
                                                : { value: "", label: "Default" }
                                            }
                                            onChange={(option) => {
                                              // Handle redirect for setup option
                                              if (option?.value === "setup") {
                                                window.open("/apps/whatsapp-business", "_blank"); // To prevent user from accidently exiting the page without saving
                                                return;
                                              }

                                              updateAction(
                                                step.id,
                                                "metaTemplatePhoneNumberId",
                                                option?.value || null
                                              );
                                              setSelectedPhoneNumberId(option?.value || null);
                                              // Reset template when phone changes
                                              updateAction(step.id, "metaTemplateName", null);
                                            }}
                                            options={[
                                              { value: "", label: "Default" },
                                              ...(whatsAppPhones && whatsAppPhones.length > 0
                                                ? whatsAppPhones.map((phone) => ({
                                                    value: phone.id,
                                                    label: phone.phoneNumber,
                                                  }))
                                                : [
                                                    {
                                                      value: "setup",
                                                      label: "→ Set up WhatsApp Business Phone",
                                                    },
                                                  ]),
                                            ]}
                                            isDisabled={readOnly}
                                            className="mt-1"
                                          />
                                        </div>
                                      )}

                                      {!step.metaTemplatePhoneNumberId && (
                                        <div className="mt-5">
                                          <Label>Message Template</Label>
                                          <Select
                                            value={
                                              templateOptions.find(
                                                (option) => option.value === step.template
                                              ) || null
                                            }
                                            onChange={(option) =>
                                              updateAction(
                                                step.id,
                                                "template",
                                                option?.value as WorkflowTemplates
                                              )
                                            }
                                            options={templateOptions}
                                            isDisabled={readOnly}
                                            className="mt-1"
                                          />
                                        </div>
                                      )}

                                      {/* WhatsApp Template Selector */}
                                      {step.metaTemplatePhoneNumberId && whatsAppTemplates && (
                                        <div className="bg-default mt-4 rounded-md">
                                          <div className="flex items-center justify-between">
                                            <Label>Message template</Label>
                                            {step.metaTemplatePhoneNumberId && (
                                              <Button
                                                color="minimal"
                                                size="sm"
                                                loading={syncingTemplates}
                                                onClick={() => handleSyncTemplates()}
                                                className="flex items-center gap-1 text-xs">
                                                <Icon name="info" className="h-4 w-4" />
                                                Sync templates
                                              </Button>
                                            )}
                                          </div>
                                          <Select
                                            value={
                                              whatsAppTemplates.find(
                                                (template) => template.name === step.metaTemplateName
                                              )
                                                ? {
                                                    value: step.metaTemplateName || "",
                                                    label:
                                                      whatsAppTemplates.find(
                                                        (t) => t.name === step.metaTemplateName
                                                      )?.name || "",
                                                  }
                                                : null
                                            }
                                            onChange={(option) => {
                                              updateAction(
                                                step.id,
                                                "metaTemplateName",
                                                option?.value || null
                                              );

                                              // Optionally auto-fill reminderBody with template body
                                              const selectedTemplate = whatsAppTemplates.find(
                                                (t) => t.name === option?.value
                                              );
                                              if (selectedTemplate?.components) {
                                                const bodyComponent = selectedTemplate.components.find(
                                                  (c: any) => c.type === "BODY"
                                                );
                                                if (bodyComponent?.text) {
                                                  updateAction(step.id, "reminderBody", bodyComponent.text);
                                                }
                                              }
                                            }}
                                            options={whatsAppTemplates.map((template) => ({
                                              value: template.name,
                                              label: `${template.name} (${template.language})`,
                                            }))}
                                            isDisabled={readOnly}
                                            className="mt-1"
                                          />
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
                                              disabled={
                                                readOnly || step.template !== WorkflowTemplates.CUSTOM
                                              }
                                              className={cn("border-default my-0 rounded-md focus:ring-2", {
                                                "cursor-not-allowed":
                                                  readOnly || step.template !== WorkflowTemplates.CUSTOM,
                                              })}
                                              required
                                              value={step.emailSubject || ""}
                                              onChange={(e) =>
                                                updateAction(step.id, "emailSubject", e.target.value)
                                              }
                                            />
                                          </div>
                                        )}

                                        {/* Message Body */}
                                        <div className="mb-2 flex items-center justify-between">
                                          <Label className="mb-0 flex-none">
                                            {isEmailAction(step.action) ? t("email_body") : t("text_message")}
                                          </Label>
                                          {step.metaTemplatePhoneNumberId && (
                                            <Button
                                              color="minimal"
                                              size="sm"
                                              onClick={() => setIsVariableDocsOpen(true)}
                                              className="flex items-center gap-1 text-xs">
                                              <Icon name="info" className="h-4 w-4" />
                                              View Available Variables
                                            </Button>
                                          )}
                                        </div>
                                        <div
                                          className={cn("rounded-md border", {
                                            "cursor-not-allowed":
                                              readOnly || step.template !== WorkflowTemplates.CUSTOM,
                                          })}>
                                          <Editor
                                            key={`editor-${step.id}-${stepTemplateUpdate}-${step.template}`}
                                            getText={() => step.reminderBody || ""}
                                            setText={(text: string) => {
                                              const stepIndex = steps.findIndex((s) => s.id === step.id);
                                              if (stepIndex !== -1) {
                                                form.setValue(`steps.${stepIndex}.reminderBody`, text, {
                                                  shouldDirty: true,
                                                  shouldValidate: false,
                                                });
                                              }
                                            }}
                                            variables={DYNAMIC_TEXT_VARIABLES}
                                            addVariableButtonTop={isSMSAction(step.action)}
                                            height="200px"
                                            editable={!readOnly && step.template === WorkflowTemplates.CUSTOM}
                                            excludedToolbarItems={
                                              !isSMSAction(step.action)
                                                ? []
                                                : ["blockType", "bold", "italic", "link"]
                                            }
                                            plainText={isSMSAction(step.action)}
                                          />
                                        </div>

                                        {/* Show error message for invalid variables */}
                                        {invalidVariables[stepId] && isWhatsappAction(step.action) && (
                                          <Alert
                                            severity="error"
                                            className="mt-2"
                                            message={`'${invalidVariables[stepId]}' is not in the allowed variables list.`}></Alert>
                                        )}

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

      {/* Delete Dialog */}
      {workflowId && (
        <WorkflowDeleteDialog
          isOpenDialog={isDeleteDialogOpen}
          setIsOpenDialog={setIsDeleteDialogOpen}
          workflowId={workflowId}
          additionalFunction={handleDeleteSuccess}
        />
      )}

      {/* Variable Documentation Dialog */}
      <VariableDocsDialog isOpen={isVariableDocsOpen} setIsOpen={setIsVariableDocsOpen} />
    </Shell>
  );
};

interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  example?: {
    header_handle?: string[];
    body_text?: string[][];
    body_text_named_params?: Array<{
      param_name: string;
      example: string;
    }>;
  };
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  parameter_format: "POSITIONAL" | "NAMED";
  components: TemplateComponent[];
}

interface ExtractedVariable {
  component: "header" | "body";
  variable: string;
  displayName: string;
  example?: string;
}

// Available workflow fields for mapping
const WORKFLOW_FIELDS = [
  { value: "event_name", label: "Event Name" },
  { value: "event_date", label: "Event Date" },
  { value: "event_time", label: "Event Time" },
  { value: "event_end_time", label: "Event End Time" },
  { value: "timezone", label: "Timezone" },
  { value: "location", label: "Location" },
  { value: "organizer_name", label: "Organizer Name" },
  { value: "attendee_name", label: "Attendee Name" },
  { value: "attendee_first_name", label: "Attendee First Name" },
  { value: "attendee_last_name", label: "Attendee Last Name" },
  { value: "attendee_email", label: "Attendee Email" },
  { value: "additional_notes", label: "Additional Notes" },
  { value: "meeting_url", label: "Meeting URL" },
  { value: "cancel_url", label: "Cancel URL" },
  { value: "reschedule_url", label: "Reschedule URL" },
  { value: "rating_url", label: "Rating URL" },
  { value: "no_show_url", label: "No-Show URL" },
  { value: "attendee_timezone", label: "Attendee Timezone" },
  { value: "event_start_time_in_attendee_timezone", label: "Event Start Time in Attendee Timezone" },
  { value: "event_end_time_in_attendee_timezone", label: "Event End Time in Attendee Timezone" },
];

// Extract variables from template
function extractVariables(template: WhatsAppTemplate): ExtractedVariable[] {
  const variables: ExtractedVariable[] = [];

  template.components.forEach((component) => {
    if (component.type === "BUTTONS") return; // Skip buttons

    const componentType = component.type.toLowerCase() as "header" | "body";

    // Only process TEXT headers and BODY components
    if (component.type === "HEADER" && component.format !== "TEXT") return;
    if (!component.text) return;

    if (template.parameter_format === "NAMED") {
      // Extract named variables
      const namedParams = component.example?.body_text_named_params || [];
      namedParams.forEach((param) => {
        variables.push({
          component: componentType,
          variable: param.param_name,
          displayName: param.param_name,
          example: param.example,
        });
      });
    } else {
      // Extract positional variables ({{1}}, {{2}}, etc.)
      const matches = component.text.matchAll(/\{\{(\d+)\}\}/g);
      for (const match of matches) {
        const position = match[1];
        variables.push({
          component: componentType,
          variable: position,
          displayName: `Variable ${position}`,
          example: undefined,
        });
      }
    }
  });

  return variables;
}

interface WhatsAppVariableMapperProps {
  template: WhatsAppTemplate | null;
  initialMapping?: VariableMapping;
  onChange: (mapping: VariableMapping) => void;
  readOnly?: boolean;
}

export default function WhatsAppVariableMapper({
  template,
  initialMapping = {},
  onChange,
  readOnly = false,
}: WhatsAppVariableMapperProps) {
  const [mapping, setMapping] = useState<VariableMapping>(initialMapping);
  const [customValues, setCustomValues] = useState<{ [key: string]: string }>({});

  // Extract variables from template
  const extractedVariables = useMemo(() => {
    if (!template) return [];
    return extractVariables(template);
  }, [template]);

  // Group variables by component
  const groupedVariables = useMemo(() => {
    const groups: { [key: string]: ExtractedVariable[] } = {
      header: [],
      body: [],
    };

    extractedVariables.forEach((variable) => {
      groups[variable.component].push(variable);
    });

    return groups;
  }, [extractedVariables]);

  // Initialize mapping when template changes
  useEffect(() => {
    if (template && Object.keys(initialMapping).length === 0) {
      const newMapping: VariableMapping = {};
      extractedVariables.forEach((variable) => {
        if (!newMapping[variable.component]) {
          newMapping[variable.component] = {};
        }
        // Set default empty mapping
        newMapping[variable.component][variable.variable] = "";
      });
      setMapping(newMapping);
    } else {
      setMapping(initialMapping);
    }
  }, [template, initialMapping, extractedVariables]);

  // Handle field selection change
  const handleFieldChange = (component: string, variable: string, value: string) => {
    const newMapping = {
      ...mapping,
      [component]: {
        ...mapping[component],
        [variable]: value,
      },
    };
    setMapping(newMapping);
    onChange(newMapping);
  };

  // Handle custom value change
  const handleCustomValueChange = (component: string, variable: string, value: string) => {
    const key = `${component}.${variable}`;
    setCustomValues({
      ...customValues,
      [key]: value,
    });

    // Update mapping with custom value
    handleFieldChange(component, variable, `custom:${value}`);
  };

  // Check if mapping is complete
  const isComplete = useMemo(() => {
    return extractedVariables.every((variable) => {
      const value = mapping[variable.component]?.[variable.variable];
      return value && value.trim() !== "";
    });
  }, [extractedVariables, mapping]);

  if (!template) {
    return (
      // <Alert>
      //   <AlertDescription>Select a WhatsApp template to configure variable mappings.</AlertDescription>
      // </Alert>
      <div>Please select a WhatsApp template to configure variable mappings.</div>
    );
  }

  if (extractedVariables.length === 0) {
    return (
      // <Alert>
      //   <AlertDescription></AlertDescription>
      // </Alert>
      <div>This template does not contain any variables to map.</div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Map Template Variables</span>
          {isComplete && <Badge variant="success">All variables mapped</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* <Alert>
          <AlertDescription></AlertDescription>

        </Alert> */}
        <div>
          Map each template variable to a workflow field. These values will be inserted into your WhatsApp
          message.
        </div>

        {/* Header Variables */}
        {groupedVariables.header.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-600">Header Variables</h3>
            <div className="space-y-4">
              {groupedVariables.header.map((variable) => {
                const currentValue = mapping[variable.component]?.[variable.variable] || "";
                const isCustom = currentValue.startsWith("custom:");
                const customKey = `${variable.component}.${variable.variable}`;

                return (
                  <div key={`${variable.component}-${variable.variable}`} className="space-y-2">
                    <Label className="flex items-center justify-between">
                      <span className="font-mono text-sm">
                        {template.parameter_format === "NAMED"
                          ? `{{${variable.variable}}}`
                          : `{{${variable.variable}}}`}
                      </span>
                      {variable.example && (
                        <span className="text-xs text-gray-500">Example: {variable.example}</span>
                      )}
                    </Label>

                    <Select
                      value={
                        WORKFLOW_FIELDS.find(
                          (f) => f.value === currentValue || (isCustom && f.value === "custom")
                        ) || null
                      }
                      onChange={(option) => {
                        if (option?.value === "custom") {
                          handleFieldChange(variable.component, variable.variable, "custom:");
                        } else {
                          handleFieldChange(variable.component, variable.variable, option?.value || "");
                        }
                      }}
                      options={WORKFLOW_FIELDS}
                      isDisabled={readOnly}
                      placeholder="Select a field..."
                    />

                    {isCustom && (
                      <Input
                        type="text"
                        placeholder="Enter custom value"
                        value={customValues[customKey] || currentValue.replace("custom:", "")}
                        onChange={(e) =>
                          handleCustomValueChange(variable.component, variable.variable, e.target.value)
                        }
                        disabled={readOnly}
                        className="mt-2"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Body Variables */}
        {groupedVariables.body.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-600">Body Variables</h3>
            <div className="space-y-4">
              {groupedVariables.body.map((variable) => {
                const currentValue = mapping[variable.component]?.[variable.variable] || "";
                const isCustom = currentValue.startsWith("custom:");
                const customKey = `${variable.component}.${variable.variable}`;

                return (
                  <div key={`${variable.component}-${variable.variable}`} className="space-y-2">
                    <Label className="flex items-center justify-between">
                      <span className="font-mono text-sm">
                        {template.parameter_format === "NAMED"
                          ? `{{${variable.variable}}}`
                          : `{{${variable.variable}}}`}
                      </span>
                      {variable.example && (
                        <span className="text-xs text-gray-500">Example: {variable.example}</span>
                      )}
                    </Label>

                    <Select
                      value={
                        WORKFLOW_FIELDS.find(
                          (f) => f.value === currentValue || (isCustom && f.value === "custom")
                        ) || null
                      }
                      onChange={(option) => {
                        if (option?.value === "custom") {
                          handleFieldChange(variable.component, variable.variable, "custom:");
                        } else {
                          handleFieldChange(variable.component, variable.variable, option?.value || "");
                        }
                      }}
                      options={WORKFLOW_FIELDS}
                      isDisabled={readOnly}
                      placeholder="Select a field..."
                    />

                    {isCustom && (
                      <Input
                        type="text"
                        placeholder="Enter custom value"
                        value={customValues[customKey] || currentValue.replace("custom:", "")}
                        onChange={(e) =>
                          handleCustomValueChange(variable.component, variable.variable, e.target.value)
                        }
                        disabled={readOnly}
                        className="mt-2"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Template Preview */}
        <div className="rounded-md border bg-gray-50 p-4">
          <h4 className="mb-2 text-sm font-semibold">Template Format</h4>
          <Badge variant={template.parameter_format === "NAMED" ? "default" : "secondary"}>
            {template.parameter_format}
          </Badge>
          <p className="mt-2 text-xs text-gray-600">
            {template.parameter_format === "NAMED"
              ? "This template uses named variables (e.g., {{email}}, {{phone}})"
              : "This template uses positional variables (e.g., {{1}}, {{2}})"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
