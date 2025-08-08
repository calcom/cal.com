"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Textarea,
  Button,
  Checkbox,
} from "@calid/features/ui";
import { Icon } from "@calid/features/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@calid/features/ui/";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";

// Import the required types and utilities from the old implementation
import { SENDER_ID, SENDER_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import type { TimeUnit, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { MembershipRole, WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Alert } from "@calcom/ui/components/alert";
import { showToast } from "@calcom/ui/components/toast";

import {
  isSMSAction,
  isSMSOrWhatsappAction,
  translateVariablesToEnglish,
  translateTextVariables as getTranslatedText,
} from "../config/utils";
import { workflowFormSchema as formSchema } from "../config/validation";

// Types migrated from old implementation
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

const VariableDropdown: React.FC<{
  onSelect: (variable: string) => void;
}> = ({ onSelect }) => {
  const variables = [
    "{EVENT_NAME}",
    "{EVENT_DATE}",
    "{EVENT_TIME}",
    "{EVENT_END_TIME}",
    "{TIMEZONE}",
    "{LOCATION}",
    "{ORGANIZER_NAME}",
    "{ATTENDEE}",
    "{ATTENDEE_FIRST_NAME}",
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button color="secondary" size="sm" className="text-xs">
          Add variable
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {variables.map((variable) => (
          <DropdownMenuItem key={variable} onClick={() => onSelect(variable)}>
            {variable}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export interface WorkflowBuilderProps {
  setHeaderMeta?: (meta: any) => void;
  template?: any;
  editWorkflow?: any;
  workflowId?: number;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  setHeaderMeta,
  template,
  editWorkflow,
  workflowId,
}) => {
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

  // Get workflow data from tRPC
  const {
    data: workflowData,
    isError,
    error,
    isPending: isPendingWorkflow,
  } = trpc.viewer.workflows.get.useQuery(
    { id: workflowId! },
    {
      enabled: !!workflowId,
    }
  );

  // Get verified numbers and emails
  const { data: verifiedNumbersData } = trpc.viewer.workflows.getVerifiedNumbers.useQuery(
    { teamId: workflowData?.team?.id },
    {
      enabled: !!workflowData?.id,
    }
  );

  const { data: verifiedEmailsData } = trpc.viewer.workflows.getVerifiedEmails.useQuery(
    {
      teamId: workflowData?.team?.id,
    },
    { enabled: !!workflowData?.id }
  );

  // Get event type options
  const isOrg = workflowData?.team?.isOrganization ?? false;
  const teamId = workflowData?.teamId ?? undefined;

  const { data: eventTypeData, isPending: isPendingEventTypes } =
    trpc.viewer.eventTypes.getTeamAndEventTypeOptions.useQuery(
      { teamId, isOrg },
      { enabled: !isPendingWorkflow }
    );

  // Process event type options
  const allEventTypeOptions = useMemo(() => {
    let options = eventTypeData?.eventTypeOptions ?? [];
    const distinctEventTypes = new Set();

    if (!teamId && isMixedEventType) {
      options = [...options, ...selectedOptions];
      options = options.filter((option) => {
        const duplicate = distinctEventTypes.has(option.value);
        distinctEventTypes.add(option.value);
        return !duplicate;
      });
    }

    return options;
  }, [eventTypeData?.eventTypeOptions, teamId, isMixedEventType, selectedOptions]);

  const teamOptions = eventTypeData?.teamOptions ?? [];

  // Permission check
  const readOnly = useMemo(() => {
    return (
      workflowData?.team?.members?.find((member) => member.userId === session.data?.user.id)?.role ===
      MembershipRole.MEMBER
    );
  }, [workflowData?.team?.members, session.data?.user.id]);

  // UI state variables (keeping from new implementation)
  const [workflowName, setWorkflowName] = useState("");
  const [trigger, setTrigger] = useState<WorkflowTriggerEvents | "">("");
  const [triggerTiming, setTriggerTiming] = useState("immediately");
  const [customTime, setCustomTime] = useState("");
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("HOUR");
  const [showEventTypeSection, setShowEventTypeSection] = useState(false);
  const [showTriggerSection, setShowTriggerSection] = useState(false);
  const [showActionsSection, setShowActionsSection] = useState(false);
  const [actions, setActions] = useState<any[]>([]);

  // Update mutation from old implementation
  const updateMutation = trpc.viewer.workflows.update.useMutation({
    onSuccess: async ({ workflow }) => {
      if (workflow) {
        utils.viewer.workflows.get.setData({ id: workflow.id }, workflow);
        showToast(
          t("workflow_updated_successfully", {
            workflowName: workflow.name,
          }),
          "success"
        );
        router.push("/workflows");
      }
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  // Set form data function from old implementation
  const setFormData = useCallback(
    (workflowDataInput: RouterOutputs["viewer"]["workflows"]["get"] | undefined) => {
      if (workflowDataInput) {
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
              value: String(active.team.id) || "",
              label: active.team.slug || "",
            }));
            setSelectedOptions(activeOn || []);
          } else {
            setSelectedOptions(
              workflowDataInput.activeOn?.flatMap((active) => {
                if (workflowDataInput.teamId && active.eventType.parentId) return [];
                return {
                  value: String(active.eventType.id),
                  label: active.eventType.title,
                };
              }) || []
            );
            activeOn = workflowDataInput.activeOn
              ? workflowDataInput.activeOn.map((active) => ({
                  value: active.eventType.id.toString(),
                  label: active.eventType.slug,
                }))
              : undefined;
          }
        }

        // Translate dynamic variables into local language
        const steps = workflowDataInput.steps?.map((step) => {
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
        });

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

        // Convert steps to actions format
        const convertedActions =
          steps?.map((step, index) => ({
            id: step.id.toString(),
            type: getActionTypeFromWorkflowAction(step.action),
            expanded: index === 0, // First action expanded by default
            senderName: step.senderName || "OneHash",
            messageTemplate: step.template,
            emailSubject: step.emailSubject || "",
            emailBody: step.reminderBody || "",
            includeCalendar: step.includeCalendarEvent,
            phoneNumber: step.sendTo || "",
            countryCode: "+1", // MANUAL: May need to extract from sendTo
            verificationCode: "",
            senderId: step.sender,
            textMessage: step.reminderBody || "",
            sendTo: step.sendTo,
            stepNumber: step.stepNumber,
            action: step.action,
          })) || [];

        setActions(convertedActions);

        // Show sections based on existing data
        setShowEventTypeSection(true);
        setShowTriggerSection(true);
        setShowActionsSection(convertedActions.length > 0);

        setIsAllDataLoaded(true);
      }
    },
    [form, isOrg, teamOptions, allEventTypeOptions, i18n.language, t]
  );

  // Helper function to convert WorkflowActions to action type
  const getActionTypeFromWorkflowAction = (action: WorkflowActions): string => {
    switch (action) {
      case WorkflowActions.EMAIL_HOST:
        return "email-host";
      case WorkflowActions.EMAIL_ATTENDEE:
        return "email-attendees";
      case WorkflowActions.EMAIL_ADDRESS:
        return "email-specific";
      case WorkflowActions.SMS_ATTENDEE:
        return "sms-attendees";
      case WorkflowActions.SMS_NUMBER:
        return "sms-specific";
      case WorkflowActions.WHATSAPP_ATTENDEE:
        return "whatsapp-attendee";
      case WorkflowActions.WHATSAPP_NUMBER:
        return "whatsapp-specific";
      default:
        return "email-attendees";
    }
  };

  // Helper function to convert action type back to WorkflowActions
  const getWorkflowActionFromActionType = (type: string): WorkflowActions => {
    switch (type) {
      case "email-host":
        return WorkflowActions.EMAIL_HOST;
      case "email-attendees":
        return WorkflowActions.EMAIL_ATTENDEE;
      case "email-specific":
        return WorkflowActions.EMAIL_ADDRESS;
      case "sms-attendees":
        return WorkflowActions.SMS_ATTENDEE;
      case "sms-specific":
        return WorkflowActions.SMS_NUMBER;
      case "whatsapp-attendee":
        return WorkflowActions.WHATSAPP_ATTENDEE;
      case "whatsapp-specific":
        return WorkflowActions.WHATSAPP_NUMBER;
      default:
        return WorkflowActions.EMAIL_ATTENDEE;
    }
  };

  // Load initial data
  useEffect(() => {
    if (!isPendingWorkflow && workflowData) {
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

  // Trigger options
  const triggerOptions = [
    {
      value: "NEW_EVENT",
      label: "When new event is booked",
    },
    {
      value: "EVENT_CANCELLED",
      label: "When event is canceled",
    },
    {
      value: "BEFORE_EVENT",
      label: "Before event starts",
    },
    {
      value: "AFTER_EVENT",
      label: "After event ends",
    },
    {
      value: "RESCHEDULE_EVENT",
      label: "When event is rescheduled",
    },
  ];

  const actionOptions = [
    {
      value: "email-host",
      label: "Send email to host",
    },
    {
      value: "email-attendees",
      label: "Send email to attendees",
    },
    {
      value: "email-specific",
      label: "Send email to a specific email address",
    },
    {
      value: "sms-attendees",
      label: "Send SMS to attendees",
    },
    {
      value: "sms-specific",
      label: "Send SMS to a specific number",
    },
    {
      value: "whatsapp-attendee",
      label: "Send WhatsApp message to attendee",
    },
    {
      value: "whatsapp-specific",
      label: "Send WhatsApp message to a specific number",
    },
  ];

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

  const handleEventTypeSelection = (categoryId: string, typeId: string) => {
    const isSelected = selectedOptions.some((option) => option.value === typeId);
    let newOptions;
    if (isSelected) {
      newOptions = selectedOptions.filter((option) => option.value !== typeId);
    } else {
      const option = allEventTypeOptions.find((opt) => opt.value === typeId);
      if (option) {
        newOptions = [...selectedOptions, option];
      } else {
        newOptions = selectedOptions;
      }
    }
    setSelectedOptions(newOptions);
    form.setValue("activeOn", newOptions);
  };

  const addAction = useCallback(() => {
    const newAction = {
      id: Date.now().toString(),
      type: "email-attendees",
      expanded: true,
      senderName: "OneHash",
      messageTemplate: WorkflowTemplates.REMINDER,
      emailSubject: "",
      emailBody: "",
      includeCalendar: false,
      phoneNumber: "",
      countryCode: "+1",
      verificationCode: "",
      senderId: "",
      textMessage: "",
      stepNumber: actions.length + 1,
      action: WorkflowActions.EMAIL_ATTENDEE,
    };
    setActions([...actions, newAction]);
  }, [actions]);

  const removeAction = useCallback((actionId: string) => {
    setActions((prev) => prev.filter((action) => action.id !== actionId));
  }, []);

  const updateAction = useCallback((actionId: string, field: string, value: any) => {
    setActions((prev) =>
      prev.map((action) =>
        action.id === actionId
          ? {
              ...action,
              [field]: value,
              // Update the corresponding WorkflowAction when type changes
              ...(field === "type" ? { action: getWorkflowActionFromActionType(value) } : {}),
            }
          : action
      )
    );
  }, []);

  const toggleActionExpanded = useCallback((actionId: string) => {
    setActions((prev) =>
      prev.map((action) => (action.id === actionId ? { ...action, expanded: !action.expanded } : action))
    );
  }, []);

  const insertVariable = useCallback(
    (actionId: string, field: string, variable: string) => {
      const action = actions.find((a) => a.id === actionId);
      if (action) {
        const currentValue = action[field as keyof typeof action] as string;
        updateAction(actionId, field, currentValue + variable);
      }
    },
    [actions, updateAction]
  );

  const isEmailAction = (type: string) => type.includes("email");
  const isSMSActionType = (type: string) => type.includes("sms") || type.includes("whatsapp");

  // Real save handler using tRPC mutation
  const handleSaveWorkflow = useCallback(async () => {
    let activeOnIds: number[] = [];
    let isEmpty = false;
    let isVerified = true;

    // Convert actions back to steps format
    const steps = actions.map((action, index) => {
      const step = {
        id: parseInt(action.id) || -(index + 1), // Use negative IDs for new steps
        stepNumber: index + 1,
        action: action.action,
        workflowId: workflowId!,
        sendTo: action.sendTo || action.phoneNumber || null,
        reminderBody: action.emailBody || action.textMessage || null,
        emailSubject: action.emailSubject || null,
        template: action.messageTemplate || WorkflowTemplates.REMINDER,
        numberRequired: isSMSActionType(action.type),
        sender: isSMSActionType(action.type) ? action.senderId || SENDER_ID : SENDER_ID,
        senderName: action.senderName || SENDER_NAME,
        numberVerificationPending: false,
        includeCalendarEvent: action.includeCalendar || false,
        verifiedAt: new Date(),
      };

      // Validation logic from old implementation
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

  // Loading and error states
  const isPending = isPendingWorkflow || isPendingEventTypes;

  if (!session.data) {
    return <div>Please log in to access this feature.</div>;
  }

  if (isError) {
    return <Alert severity="error" title="Something went wrong" message={error?.message ?? ""} />;
  }

  if (isPending) {
    return <div>Loading...</div>; // MANUAL: Replace with proper loading skeleton
  }

  return (
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
                      {isOrg ? "Which teams will this apply to?" : "Which event types will this apply to?"}
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button color="secondary" className="mt-2 w-full justify-between" disabled={readOnly}>
                          {selectedOptions.length > 0
                            ? `${selectedOptions.length} ${isOrg ? "teams" : "event types"} selected`
                            : `Select ${isOrg ? "teams" : "event types"}...`}
                          <Icon name="chevron-down" className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-80">
                        <div className="space-y-4 p-4">
                          {(isOrg ? teamOptions : allEventTypeOptions).map((option) => (
                            <div key={option.value} className="mb-2 flex items-center space-x-2">
                              <Checkbox
                                id={option.value}
                                checked={selectedOptions.some((selected) => selected.value === option.value)}
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
                      <SelectContent>
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
                                <SelectContent>
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

          {/* Actions Section */}
          {showActionsSection && (
            <div className="animate-slide-in-up">
              <Card className="animate-slide-in-up">
                <CardHeader>
                  <CardTitle>Do this</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {actions.map((action) => (
                    <Card key={action.id} className="border">
                      <Collapsible
                        open={action.expanded}
                        onOpenChange={() => toggleActionExpanded(action.id)}>
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-1 items-center space-x-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-100">
                                <span className="text-xs font-medium">
                                  {isEmailAction(action.type) ? "📧" : "📱"}
                                </span>
                              </div>
                              <Select
                                value={action.type}
                                onValueChange={(value) => updateAction(action.id, "type", value)}
                                disabled={readOnly}>
                                <SelectTrigger className="w-64">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {actionOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                              <CollapsibleTrigger asChild>
                                <Button color="secondary" size="sm" className="p-2">
                                  <Icon
                                    name="chevron-down"
                                    className={`h-4 w-4 transition-transform ${
                                      action.expanded ? "rotate-180" : ""
                                    }`}
                                  />
                                </Button>
                              </CollapsibleTrigger>
                              {actions.length > 1 && !readOnly && (
                                <Button
                                  color="destructive"
                                  size="sm"
                                  onClick={() => removeAction(action.id)}
                                  className="p-2">
                                  <Icon name="trash-2" className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <CollapsibleContent className="mt-4">
                            <div className="space-y-4">
                              {isEmailAction(action.type) && (
                                <>
                                  <div>
                                    <Label htmlFor={`sender-${action.id}`}>Sender name</Label>
                                    <Input
                                      id={`sender-${action.id}`}
                                      value={action.senderName}
                                      onChange={(e) => updateAction(action.id, "senderName", e.target.value)}
                                      className="mt-1"
                                      disabled={readOnly}
                                    />
                                  </div>

                                  <div>
                                    <Label htmlFor={`template-${action.id}`}>Choose a template</Label>
                                    <Select
                                      value={action.messageTemplate}
                                      onValueChange={(value) =>
                                        updateAction(action.id, "messageTemplate", value)
                                      }
                                      disabled={readOnly}>
                                      <SelectTrigger className="mt-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value={WorkflowTemplates.CUSTOM}>Custom</SelectItem>
                                        <SelectItem value={WorkflowTemplates.REMINDER}>Reminder</SelectItem>
                                        <SelectItem value={WorkflowTemplates.THANK_YOU}>Thank You</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {action.type === "email-specific" && (
                                    <div>
                                      <Label htmlFor={`email-${action.id}`}>Email address</Label>
                                      <Input
                                        id={`email-${action.id}`}
                                        value={action.sendTo || ""}
                                        onChange={(e) => updateAction(action.id, "sendTo", e.target.value)}
                                        className="mt-1"
                                        placeholder="recipient@example.com"
                                        disabled={readOnly}
                                      />
                                      {/* MANUAL: Add email verification status indicator */}
                                    </div>
                                  )}

                                  <div>
                                    <div className="flex items-center justify-between">
                                      <Label htmlFor={`subject-${action.id}`}>Subject Line</Label>
                                      {!readOnly && (
                                        <VariableDropdown
                                          onSelect={(variable) =>
                                            insertVariable(action.id, "emailSubject", variable)
                                          }
                                        />
                                      )}
                                    </div>
                                    <Input
                                      id={`subject-${action.id}`}
                                      value={action.emailSubject}
                                      onChange={(e) =>
                                        updateAction(action.id, "emailSubject", e.target.value)
                                      }
                                      className="mt-1"
                                      disabled={readOnly}
                                    />
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between">
                                      <Label htmlFor={`body-${action.id}`}>Email Body</Label>
                                      {!readOnly && (
                                        <VariableDropdown
                                          onSelect={(variable) =>
                                            insertVariable(action.id, "emailBody", variable)
                                          }
                                        />
                                      )}
                                    </div>
                                    <Textarea
                                      id={`body-${action.id}`}
                                      value={action.emailBody}
                                      onChange={(e) => updateAction(action.id, "emailBody", e.target.value)}
                                      className="min-h-32 mt-1"
                                      placeholder="Enter email content..."
                                      disabled={readOnly}
                                    />
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`calendar-${action.id}`}
                                      checked={action.includeCalendar}
                                      onCheckedChange={(checked) =>
                                        updateAction(action.id, "includeCalendar", checked)
                                      }
                                      disabled={readOnly}
                                    />
                                    <Label htmlFor={`calendar-${action.id}`} className="text-sm">
                                      Include Calendar Event
                                    </Label>
                                  </div>
                                </>
                              )}

                              {isSMSActionType(action.type) && (
                                <>
                                  {(action.type === "sms-specific" ||
                                    action.type === "whatsapp-specific") && (
                                    <div>
                                      <Label htmlFor={`phone-${action.id}`}>
                                        {action.type.includes("whatsapp")
                                          ? "WhatsApp Number"
                                          : "Phone Number"}
                                      </Label>
                                      <div className="mt-1 flex">
                                        <Select
                                          value={action.countryCode}
                                          onValueChange={(value) =>
                                            updateAction(action.id, "countryCode", value)
                                          }
                                          disabled={readOnly}>
                                          <SelectTrigger className="w-20">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="+1">+1</SelectItem>
                                            <SelectItem value="+44">+44</SelectItem>
                                            <SelectItem value="+91">+91</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <Input
                                          id={`phone-${action.id}`}
                                          value={action.phoneNumber}
                                          onChange={(e) => {
                                            updateAction(action.id, "phoneNumber", e.target.value);
                                            updateAction(
                                              action.id,
                                              "sendTo",
                                              `${action.countryCode}${e.target.value}`
                                            );
                                          }}
                                          className="ml-2 flex-1"
                                          placeholder="Phone number"
                                          disabled={readOnly}
                                        />
                                        {!readOnly && (
                                          <Button size="sm" className="ml-2">
                                            {/* MANUAL: Implement phone verification */}
                                            Send Code
                                          </Button>
                                        )}
                                      </div>
                                      {/* MANUAL: Add verification status indicator based on verifiedNumbersData */}
                                    </div>
                                  )}

                                  {action.phoneNumber && !readOnly && (
                                    <div>
                                      <Label htmlFor={`verification-${action.id}`}>Verification code</Label>
                                      <div className="mt-1 flex">
                                        <Input
                                          id={`verification-${action.id}`}
                                          value={action.verificationCode}
                                          onChange={(e) =>
                                            updateAction(action.id, "verificationCode", e.target.value)
                                          }
                                          className="flex-1"
                                          placeholder="Enter verification code"
                                        />
                                        <Button size="sm" className="ml-2">
                                          {/* MANUAL: Implement verification logic */}
                                          Verify
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  <div>
                                    <Label htmlFor={`sender-id-${action.id}`}>Sender ID</Label>
                                    <Input
                                      id={`sender-id-${action.id}`}
                                      value={action.senderId}
                                      onChange={(e) => updateAction(action.id, "senderId", e.target.value)}
                                      className="mt-1"
                                      disabled={readOnly}
                                    />
                                  </div>

                                  <div>
                                    <Label htmlFor={`template-${action.id}`}>Choose a template</Label>
                                    <Select
                                      value={action.messageTemplate}
                                      onValueChange={(value) =>
                                        updateAction(action.id, "messageTemplate", value)
                                      }
                                      disabled={readOnly}>
                                      <SelectTrigger className="mt-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value={WorkflowTemplates.CUSTOM}>Custom</SelectItem>
                                        <SelectItem value={WorkflowTemplates.REMINDER}>Reminder</SelectItem>
                                        <SelectItem value={WorkflowTemplates.THANK_YOU}>Thank You</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between">
                                      <Label htmlFor={`text-message-${action.id}`}>
                                        {action.type.includes("whatsapp")
                                          ? "WhatsApp Message"
                                          : "Text Message"}
                                      </Label>
                                      {!readOnly && (
                                        <VariableDropdown
                                          onSelect={(variable) =>
                                            insertVariable(action.id, "textMessage", variable)
                                          }
                                        />
                                      )}
                                    </div>
                                    <Textarea
                                      id={`text-message-${action.id}`}
                                      value={action.textMessage}
                                      onChange={(e) => updateAction(action.id, "textMessage", e.target.value)}
                                      className="min-h-32 mt-1"
                                      placeholder={`Enter ${
                                        action.type.includes("whatsapp") ? "WhatsApp" : "text"
                                      } message...`}
                                      disabled={readOnly}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    </Card>
                  ))}

                  {!readOnly && (
                    <Button color="secondary" onClick={addAction} className="w-full border-2 border-dashed">
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
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <Icon name="info" className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Read-only Access</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>You have read-only access to this workflow. Contact a team admin to make changes.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
