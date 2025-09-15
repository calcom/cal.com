import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useState, useRef, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { CAL_AI_PHONE_NUMBER_MONTHLY_PRICE } from "@calcom/lib/constants";
import { formatPhoneNumber } from "@calcom/lib/formatPhoneNumber";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogHeader, DialogFooter as BaseDialogFooter } from "@calcom/ui/components/dialog";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { Dialog as UIDialog } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { AddVariablesDropdown } from "@calcom/ui/components/editor";
import { ToggleGroup, Switch } from "@calcom/ui/components/form";
import { Label, TextArea, Input, TextField, Form } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { DYNAMIC_TEXT_VARIABLES } from "../lib/constants";
import type { FormValues } from "../pages/workflow";
import { TestPhoneCallDialog } from "./TestPhoneCallDialog";
import { WebCallDialog } from "./WebCallDialog";

// Utility functions for prompt display
const cleanPromptForDisplay = (prompt: string): string => {
  if (!prompt) return prompt;

  const cleanedPrompt = prompt
    .replace(/check_availability_\{\{eventTypeId\}\}/g, "check_availability")
    .replace(/book_appointment_\{\{eventTypeId\}\}/g, "book_appointment")
    .replace(/check_availability_\d+/g, "check_availability")
    .replace(/book_appointment_\d+/g, "book_appointment");

  return cleanedPrompt;
};

const restorePromptComplexity = (prompt: string): string => {
  if (!prompt) return prompt;

  const restoredPrompt = prompt
    .replace(/\bcheck_availability\b/g, "check_availability_{{eventTypeId}}")
    .replace(/\bbook_appointment\b/g, "book_appointment_{{eventTypeId}}");

  return restoredPrompt;
};

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

const phoneNumberFormSchema = z.object({
  phoneNumber: z.string().refine((val) => isValidPhoneNumber(val)),
  terminationUri: z.string().min(1, "Termination URI is required"),
  sipTrunkAuthUsername: z.string().optional(),
  sipTrunkAuthPassword: z.string().optional(),
  nickname: z.string().optional(),
});

type AgentFormValues = z.infer<typeof agentSchema>;
type PhoneNumberFormValues = z.infer<typeof phoneNumberFormSchema>;
// type RetellData = RouterOutputs["viewer"]["ai"]["get"]["retellData"];

// type ToolDraft = {
//   type: string;
//   name: string;
//   description: string | null;
//   cal_api_key: string | null;
//   event_type_id: number | null;
//   timezone: string;
// };

type AgentConfigurationSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId?: string | null;
  agentData?: RouterOutputs["viewer"]["aiVoiceAgent"]["get"];
  onUpdate: (data: AgentFormValues) => void;
  readOnly?: boolean;
  teamId?: number;
  isOrganization?: boolean;
  workflowId?: string;
  workflowStepId?: number;
  activeTab?: "prompt" | "phoneNumber";
  form: UseFormReturn<FormValues>;
};

export function AgentConfigurationSheet({
  open,
  activeTab: _activeTab,
  onOpenChange,
  agentId,
  agentData,
  onUpdate,
  readOnly = false,
  teamId,
  isOrganization = false,
  workflowId,
  workflowStepId: _workflowStepId,
  form,
}: AgentConfigurationSheetProps) {
  const { t } = useLocale();

  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"prompt" | "phoneNumber">(_activeTab ?? "prompt");
  const [isBuyDialogOpen, setIsBuyDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [isTestAgentDialogOpen, setIsTestAgentDialogOpen] = useState(false);
  const [isWebCallDialogOpen, setIsWebCallDialogOpen] = useState(false);
  const [cancellingNumberId, setCancellingNumberId] = useState<number | null>(null);
  const [numberToDelete, setNumberToDelete] = useState<string | null>(null);
  // const [toolDialogOpen, setToolDialogOpen] = useState(false);
  // const [editingToolIndex, setEditingToolIndex] = useState<number | null>(null);
  // const [toolDraft, setToolDraft] = useState<ToolDraft | null>(null);

  const generalPromptRef = useRef<HTMLTextAreaElement | null>(null);

  const agentForm = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      generalPrompt: "",
      beginMessage: "",
      numberToCall: "",
      generalTools: [],
    },
  });

  useEffect(() => {
    if (agentData?.retellData) {
      const retellData = agentData.retellData;
      agentForm.reset({
        generalPrompt: cleanPromptForDisplay(retellData.generalPrompt || ""),
        beginMessage: retellData.beginMessage || "",
        numberToCall: "",
        generalTools: retellData.generalTools || [],
      });
    }
  }, [agentData, agentForm]);

  const phoneNumberForm = useForm<PhoneNumberFormValues>({
    resolver: zodResolver(phoneNumberFormSchema),
    defaultValues: {
      phoneNumber: "",
      terminationUri: "",
      sipTrunkAuthUsername: "",
      sipTrunkAuthPassword: "",
      nickname: "",
    },
  });

  // const {
  //   fields: toolFields,
  //   append: appendTool,
  //   remove: removeTool,
  //   update: updateTool,
  // } = useFieldArray({
  //   control: agentForm.control,
  //   name: "generalTools",
  // });

  const buyNumberMutation = trpc.viewer.phoneNumber.buy.useMutation({
    onSuccess: async (data: { checkoutUrl?: string; message?: string; phoneNumber?: unknown }) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.phoneNumber) {
        showToast(t("phone_number_purchased_successfully"), "success");
        await utils.viewer.me.get.invalidate();
        setIsBuyDialogOpen(false);
        if (agentId) {
          utils.viewer.aiVoiceAgent.get.invalidate({ id: agentId });
        }
      } else {
        showToast(data.message || t("something_went_wrong"), "error");
      }
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const importNumberMutation = trpc.viewer.phoneNumber.import.useMutation({
    onSuccess: async (_data: unknown) => {
      showToast(t("phone_number_imported_successfully"), "success");
      setIsImportDialogOpen(false);
      phoneNumberForm.reset();

      await utils.viewer.me.get.invalidate();
      if (agentId) {
        await utils.viewer.aiVoiceAgent.get.invalidate({ id: agentId });
      }
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const cancelSubscriptionMutation = trpc.viewer.phoneNumber.cancel.useMutation({
    onSuccess: async (data: { message?: string }) => {
      showToast(data.message || t("phone_number_subscription_cancelled_successfully"), "success");
      setCancellingNumberId(null);

      await utils.viewer.me.get.invalidate();
      if (agentId) {
        await utils.viewer.aiVoiceAgent.get.invalidate({ id: agentId });
      }
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
      setCancellingNumberId(null);
    },
  });

  const deletePhoneNumberMutation = trpc.viewer.phoneNumber.delete.useMutation({
    onSuccess: async () => {
      showToast(t("phone_number_deleted_successfully"), "success");
      setNumberToDelete(null);

      if (agentId) {
        await utils.viewer.aiVoiceAgent.get.invalidate({ id: agentId });
      }
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
      setNumberToDelete(null);
    },
  });

  const agentQuery = trpc.viewer.aiVoiceAgent.get.useQuery(
    { id: agentId || "" },
    {
      enabled: !!agentId,
      refetchOnMount: false,
    }
  );

  const updateAgentMutation = trpc.viewer.aiVoiceAgent.update.useMutation({
    onSuccess: () => {
      if (agentId) {
        agentQuery.refetch();
      }
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const handleAgentUpdate = async (data: AgentFormValues) => {
    if (!agentId) return;

    // Only send prompt-related fields, not tools
    const updatePayload = {
      generalPrompt: restorePromptComplexity(data.generalPrompt),
      beginMessage: data.beginMessage,
      // Don't include generalTools - they are managed by the backend
    };

    await updateAgentMutation.mutateAsync({
      id: agentId,
      teamId: teamId,
      ...updatePayload,
    });

    onUpdate(updatePayload);
  };

  // const openAddToolDialog = () => {
  //   setEditingToolIndex(null);
  //   setToolDraft({
  //     type: "check_availability_cal",
  //     name: "",
  //     description: "",
  //     cal_api_key: null,
  //     event_type_id: null,
  //     timezone: "",
  //   });
  //   setToolDialogOpen(true);
  // };

  // const openEditToolDialog = (idx: number) => {
  //   const tool = toolFields[idx];
  //   if (tool) {
  //     setEditingToolIndex(idx);
  //     setToolDraft({ ...tool });
  //     setToolDialogOpen(true);
  //   }
  // };

  // const handleToolDialogSave = () => {
  //   if (!toolDraft?.name || !toolDraft?.type) return;

  //   if (toolDraft.type === "check_availability_cal" || toolDraft.type === "book_appointment_cal") {
  //     if (!toolDraft.cal_api_key) {
  //       showToast(t("API Key is required for Cal.com tools"), "error");
  //       return;
  //     }
  //     if (!toolDraft.event_type_id) {
  //       showToast(t("Event Type ID is required for Cal.com tools"), "error");
  //       return;
  //     }
  //     if (!toolDraft.timezone) {
  //       showToast(t("Timezone is required for Cal.com tools"), "error");
  //       return;
  //     }
  //   }

  //   if (editingToolIndex !== null) {
  //     updateTool(editingToolIndex, toolDraft);
  //   } else {
  //     appendTool(toolDraft);
  //   }
  //   setToolDialogOpen(false);
  //   setToolDraft(null);
  //   setEditingToolIndex(null);
  // };

  // const handleToolDelete = (idx: number) => {
  //   removeTool(idx);
  // };

  const handleImportPhoneNumber = (values: PhoneNumberFormValues) => {
    if (!agentId) {
      showToast(t("agent_required_for_import"), "error");
      return;
    }
    const mutationPayload = {
      ...values,
      workflowId: workflowId,
      agentId: agentId,
      teamId: teamId,
    };
    importNumberMutation.mutate(mutationPayload);
  };

  const handleCancelSubscription = (phoneNumberId: number) => {
    setCancellingNumberId(phoneNumberId);
  };

  const handleDeletePhoneNumber = (phoneNumber: string) => {
    setNumberToDelete(phoneNumber);
  };

  const confirmCancelSubscription = () => {
    if (cancellingNumberId) {
      cancelSubscriptionMutation.mutate({ phoneNumberId: cancellingNumberId });
    }
  };

  const confirmDeletePhoneNumber = () => {
    if (numberToDelete) {
      deletePhoneNumberMutation.mutate({ phoneNumber: numberToDelete });
    }
  };

  const addVariableToGeneralPrompt = (variable: string) => {
    if (generalPromptRef.current) {
      const currentPrompt = generalPromptRef.current.value || "";
      const cursorPosition = generalPromptRef.current.selectionStart || currentPrompt.length;
      const variableName = `{${variable.toUpperCase().replace(/ /g, "_")}}`;
      const newPrompt = `${currentPrompt.substring(
        0,
        cursorPosition
      )}${variableName}${currentPrompt.substring(cursorPosition)}`;

      agentForm.setValue("generalPrompt", newPrompt, { shouldDirty: true, shouldTouch: true });

      requestAnimationFrame(() => {
        if (generalPromptRef.current) {
          generalPromptRef.current.focus();
          generalPromptRef.current.setSelectionRange(
            cursorPosition + variableName.length,
            cursorPosition + variableName.length
          );
        }
      });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader showCloseButton={false} className="w-full">
            <SheetTitle className="mb-6">{t("cal_ai_agent_configuration")}</SheetTitle>
            <ToggleGroup
              onValueChange={(val) => {
                setActiveTab((val || "prompt") as "prompt" | "phoneNumber");
              }}
              value={activeTab}
              options={[
                { value: "prompt", label: t("prompt") },
                { value: "phoneNumber", label: t("phone_number") },
              ]}
              isFullWidth={true}
            />
          </SheetHeader>
          <SheetBody className="px-0">
            {activeTab === "prompt" && (
              <div className="space-y-4">
                <div>
                  <Label className="text-emphasis mb-1 block text-sm font-medium">
                    {t("initial_message")} *
                  </Label>
                  <p className="text-subtle mb-1.5 text-xs">{t("initial_message_description")}</p>
                  <Input
                    type="text"
                    {...agentForm.register("beginMessage")}
                    placeholder={t("hi_how_are_you_doing")}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <div className="mb-1.5">
                    <Label className="text-emphasis mb-1 block text-sm font-medium">
                      {t("general_prompt")} *
                    </Label>
                    <p className="text-subtle text-xs">{t("general_prompt_description")}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-t-lg border border-b-0 p-2">
                    {!readOnly && (
                      <AddVariablesDropdown
                        addVariable={addVariableToGeneralPrompt}
                        variables={[...DYNAMIC_TEXT_VARIABLES, "number_to_call"]}
                        addVariableButtonClassName="border rounded-[10px] py-1 px-1"
                      />
                    )}
                  </div>
                  <TextArea
                    {...agentForm.register("generalPrompt")}
                    ref={(e) => {
                      agentForm.register("generalPrompt").ref(e);
                      generalPromptRef.current = e;
                    }}
                    placeholder={t("enter_the_general_prompt_for_the_agent")}
                    className="min-h-[500px] rounded-t-none"
                    disabled={readOnly}
                  />
                </div>

                {/* <div className="p-4 rounded-lg border border-subtle bg-default">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-emphasis">{t("Functions")}</h4>
                      <p className="text-xs text-subtle">
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
                      disabled={readOnly}>
                      <Icon name="plus" className="mr-2 w-4 h-4" />
                      {t("Add Function")}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {toolFields.map((tool, idx) => (
                      <div
                        key={tool.id}
                        className="flex justify-between items-center p-4 rounded-lg border transition-colors border-subtle bg-muted hover:bg-default">
                        <div className="flex gap-3">
                          <div className="flex justify-center items-center w-8 h-8 rounded-md border bg-default border-subtle">
                            <Icon name="zap" className="w-4 h-4 text-emphasis" />
                          </div>
                          <div>
                            <p className="font-medium text-emphasis">{tool.name}</p>
                            <p className="text-sm text-subtle">
                              {tool.type === "check_availability_cal" && t("Check Availability")}
                              {tool.type === "book_appointment_cal" && t("Book Appointment")}
                              {tool.type === "end_call" && t("End Call")}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Button
                            type="button"
                            size="sm"
                            color="secondary"
                            variant="icon"
                            onClick={() => openEditToolDialog(idx)}
                            disabled={readOnly}>
                            <Icon name="pencil" className="w-4 h-4" />
                          </Button>
                          {tool.name !== "end_call" && (
                            <Button
                              type="button"
                              color="destructive"
                              variant="icon"
                              size="sm"
                              onClick={() => handleToolDelete(idx)}
                              disabled={readOnly}>
                              <Icon name="trash" className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {toolFields.length === 0 && (
                      <div className="flex flex-col justify-center items-center p-6 text-center rounded-lg border border-subtle bg-muted">
                        <Icon name="zap" className="w-6 h-6 text-subtle" />
                        <p className="mt-2 text-sm text-subtle">{t("No functions configured yet")}</p>
                        <p className="text-xs text-subtle">
                          {t("Add functions to enable advanced capabilities")}
                        </p>
                      </div>
                    )}
                  </div>
                </div> */}
              </div>
            )}

            {activeTab === "phoneNumber" && (
              <div className="relative space-y-2">
                {agentQuery.isFetching && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/50">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Icon name="loader" className="h-4 w-4 animate-spin" />
                      {t("updating")}...
                    </div>
                  </div>
                )}
                {agentData?.outboundPhoneNumbers &&
                agentData.outboundPhoneNumbers.filter(
                  (phone) =>
                    phone.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE ||
                    !phone.subscriptionStatus
                ).length > 0 ? (
                  <>
                    <div className="border-subtle rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-emphasis text-sm">
                              {formatPhoneNumber(
                                agentData.outboundPhoneNumbers.filter(
                                  (phone) =>
                                    phone.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE ||
                                    !phone.subscriptionStatus
                                )[0].phoneNumber
                              )}
                            </span>
                            <Badge variant="green" size="md" withDot>
                              {t("active")}
                            </Badge>
                            {agentData.outboundPhoneNumbers.filter(
                              (phone) =>
                                phone.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE ||
                                !phone.subscriptionStatus
                            )[0].subscriptionStatus && (
                              <span className="text-muted text-xs">
                                {t("phone_number_cost", {
                                  price: CAL_AI_PHONE_NUMBER_MONTHLY_PRICE,
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Dropdown>
                            <DropdownMenuTrigger asChild>
                              <Button
                                color="secondary"
                                className="rounded-[10px]"
                                disabled={readOnly}
                                EndIcon="chevron-down">
                                {t("test_agent")}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>
                                <DropdownItem
                                  type="button"
                                  StartIcon="phone"
                                  onClick={() => {
                                    setIsTestAgentDialogOpen(true);
                                  }}>
                                  {t("phone_call")}
                                </DropdownItem>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <DropdownItem
                                  type="button"
                                  StartIcon="monitor"
                                  onClick={() => {
                                    setIsWebCallDialogOpen(true);
                                  }}>
                                  {t("web_call")}
                                </DropdownItem>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </Dropdown>
                          <Dropdown>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" color="secondary" variant="icon" StartIcon="ellipsis" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>
                                <DropdownItem
                                  type="button"
                                  StartIcon="trash"
                                  color="destructive"
                                  onClick={() => {
                                    const activePhoneNumbers = agentData?.outboundPhoneNumbers?.filter(
                                      (phone) =>
                                        phone.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE ||
                                        !phone.subscriptionStatus
                                    );
                                    const phoneNumber = activePhoneNumbers?.[0];
                                    if (phoneNumber) {
                                      if (
                                        phoneNumber.subscriptionStatus ===
                                        PhoneNumberSubscriptionStatus.ACTIVE
                                      ) {
                                        handleCancelSubscription(phoneNumber.id);
                                      } else {
                                        handleDeletePhoneNumber(phoneNumber.phoneNumber);
                                      }
                                    }
                                  }}>
                                  {agentData?.outboundPhoneNumbers?.filter(
                                    (phone) =>
                                      phone.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE ||
                                      !phone.subscriptionStatus
                                  )?.[0]?.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE
                                    ? t("unsubscribe")
                                    : t("delete")}
                                </DropdownItem>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </Dropdown>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="border-subtle rounded-xl border p-8">
                    <div className="flex flex-col items-center space-y-6 text-center">
                      <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-lg">
                        <Icon name="phone" className="text-subtle h-8 w-8" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-emphasis text-lg font-semibold">{t("no_phone_numbers")}</h3>
                        <p className="text-subtle text-sm">
                          {t("buy_a_phone_number_or_import_one_you_already_have")}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => setIsBuyDialogOpen(true)}
                          StartIcon="external-link"
                          className="px-6"
                          disabled={buyNumberMutation.isPending}>
                          {t("buy")}
                        </Button>
                        <Button
                          onClick={() => setIsImportDialogOpen(true)}
                          color="secondary"
                          className="px-6"
                          disabled={importNumberMutation.isPending}>
                          {t("import")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </SheetBody>
          <SheetFooter>
            <div className="mr-auto">
              <Dropdown>
                <DropdownMenuTrigger asChild>
                  <Button
                    color="secondary"
                    className="rounded-[10px]"
                    disabled={readOnly}
                    EndIcon="chevron-down">
                    {t("test_agent")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <DropdownItem
                      type="button"
                      StartIcon="monitor"
                      onClick={() => {
                        setIsWebCallDialogOpen(true);
                      }}>
                      {t("web_call")}
                    </DropdownItem>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </Dropdown>
            </div>
            <Button
              className="justify-center"
              type="button"
              color="secondary"
              onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              className="justify-center"
              onClick={agentForm.handleSubmit(handleAgentUpdate)}
              disabled={!agentForm.formState.isDirty || readOnly || updateAgentMutation.isPending}
              loading={updateAgentMutation.isPending}>
              {t("save")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={isBuyDialogOpen} onOpenChange={setIsBuyDialogOpen}>
        <DialogContent type="creation">
          <DialogHeader
            title={t("buy_a_new_number")}
            subtitle={t("buy_number_for_x_per_month", {
              priceInDollars: CAL_AI_PHONE_NUMBER_MONTHLY_PRICE,
            })}
          />
          <div className="flex flex-col">
            <div>
              <div>
                <Alert
                  className="mb-4"
                  severity="info"
                  message={t("only_us_phone_numbers_can_be_purchased_here")}
                />
                <Label>{t("supported_call_destinations")}</Label>
                <div className="-mb-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇺🇸</span>
                    <span className="text-default">United States</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇮🇳</span>
                    <span className="text-default">India</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇦🇺</span>
                    <span className="text-default">Australia</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇩🇪</span>
                    <span className="text-default">Germany</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇪🇸</span>
                    <span className="text-default">Spain</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇬🇧</span>
                    <span className="text-default">United Kingdom</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇲🇽</span>
                    <span className="text-default">Mexico</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇫🇷</span>
                    <span className="text-default">France</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇯🇵</span>
                    <span className="text-default">Japan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇨🇦</span>
                    <span className="text-default">Canada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇮🇹</span>
                    <span className="text-default">Italy</span>
                  </div>
                </div>
              </div>
            </div>
            <BaseDialogFooter showDivider className="relative">
              <Button onClick={() => setIsBuyDialogOpen(false)} color="secondary">
                {t("close")}
              </Button>
              <Button
                StartIcon="external-link"
                onClick={() => {
                  if (!agentId || !workflowId) {
                    return;
                  }
                  buyNumberMutation.mutate({
                    agentId: agentId,
                    workflowId: workflowId,
                    teamId: teamId ?? undefined,
                  });
                }}
                loading={buyNumberMutation.isPending}
                disabled={buyNumberMutation.isPending}>
                {t("buy_us_number_button", { priceInDollars: CAL_AI_PHONE_NUMBER_MONTHLY_PRICE })}
              </Button>
            </BaseDialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent enableOverflow type="creation">
          <DialogHeader title={t("import_phone_number")} subtitle={t("import_phone_number_description")} />

          <Form form={phoneNumberForm} handleSubmit={(values) => handleImportPhoneNumber(values)}>
            <div className="space-y-6">
              <Controller
                name="phoneNumber"
                control={phoneNumberForm.control}
                render={({ field: { value } }) => (
                  <TextField
                    name="phoneNumber"
                    label={
                      <span className="flex items-center gap-1">
                        {t("phone_number")}
                        <Tooltip content={t("phone_number_info_tooltip")}>
                          <Icon name="info" className="text-muted h-4 w-4 cursor-pointer" />
                        </Tooltip>
                      </span>
                    }
                    value={value}
                    required
                    type="text"
                    placeholder="eg:- +12088782105"
                    onChange={(e) => {
                      phoneNumberForm.setValue("phoneNumber", e?.target.value, { shouldDirty: true });
                    }}
                  />
                )}
              />

              <Controller
                name="terminationUri"
                control={phoneNumberForm.control}
                render={({ field: { value } }) => (
                  <TextField
                    name="terminationUri"
                    label={
                      <span className="flex items-center gap-1">
                        {t("termination_uri")}
                        <Tooltip content={t("termination_uri_info_tooltip")}>
                          <Icon name="info" className="text-muted h-4 w-4 cursor-pointer" />
                        </Tooltip>
                      </span>
                    }
                    value={value}
                    required
                    type="text"
                    placeholder="sip.example.co.pstn.twilio.com"
                    onChange={(e) => {
                      phoneNumberForm.setValue("terminationUri", e?.target.value, { shouldDirty: true });
                    }}
                  />
                )}
              />

              <div className="bg-muted rounded-xl p-1">
                <div className="flex items-center justify-between p-2">
                  <Label className="text-emphasis mb-0 text-sm font-medium leading-none">
                    {t("advanced")}
                  </Label>
                  <Switch size="sm" checked={showAdvancedFields} onCheckedChange={setShowAdvancedFields} />
                </div>

                {showAdvancedFields && (
                  <div className="bg-default space-y-5 rounded-lg p-4">
                    <Controller
                      name="sipTrunkAuthUsername"
                      control={phoneNumberForm.control}
                      render={({ field: { value } }) => (
                        <TextField
                          name="sipTrunkAuthUsername"
                          label={
                            <span className="flex items-center gap-1">
                              {t("sip_trunk_username")}
                              <Tooltip content={t("sip_trunk_username_info_tooltip")}>
                                <Icon name="info" className="text-muted h-4 w-4 cursor-pointer" />
                              </Tooltip>
                            </span>
                          }
                          value={value}
                          type="text"
                          onChange={(e) => {
                            phoneNumberForm.setValue("sipTrunkAuthUsername", e?.target.value, {
                              shouldDirty: true,
                            });
                          }}
                        />
                      )}
                    />

                    <Controller
                      name="sipTrunkAuthPassword"
                      control={phoneNumberForm.control}
                      render={({ field: { value } }) => (
                        <TextField
                          name="sipTrunkAuthPassword"
                          label={
                            <span className="flex items-center gap-1">
                              {t("sip_trunk_password")}
                              <Tooltip content={t("sip_trunk_password_info_tooltip")}>
                                <Icon name="info" className="text-muted h-4 w-4 cursor-pointer" />
                              </Tooltip>
                            </span>
                          }
                          value={value}
                          type="password"
                          onChange={(e) => {
                            phoneNumberForm.setValue("sipTrunkAuthPassword", e?.target.value, {
                              shouldDirty: true,
                            });
                          }}
                        />
                      )}
                    />

                    <Controller
                      name="nickname"
                      control={phoneNumberForm.control}
                      render={({ field: { value } }) => (
                        <TextField
                          name="nickname"
                          label={
                            <span className="flex items-center gap-1">
                              {t("nickname")}
                              <Tooltip content={t("nickname_info_tooltip")}>
                                <Icon name="info" className="text-muted h-4 w-4 cursor-pointer" />
                              </Tooltip>
                            </span>
                          }
                          value={value}
                          type="text"
                          onChange={(e) => {
                            phoneNumberForm.setValue("nickname", e?.target.value, { shouldDirty: true });
                          }}
                        />
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Having trouble importing section */}
              <div className="rounded-lg border p-2">
                <div className="flex items-start gap-3">
                  <Icon name="info" className="text-subtle mt-0.5 h-5 w-5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-emphasis text-sm font-medium">{t("having_trouble_importing")}</p>
                    <p className="text-subtle mt-1 text-sm leading-tight">
                      {t("learn_how_to_get_your_terminator")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    color="secondary"
                    size="base"
                    EndIcon="external-link"
                    href="https://cal.com/help/importing/import-numbers"
                    target="_blank"
                    className="text-emphasis my-auto">
                    {t("learn")}
                  </Button>
                </div>
              </div>
            </div>

            <BaseDialogFooter showDivider className="relative">
              <Button onClick={() => setIsImportDialogOpen(false)} color="secondary">
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                loading={importNumberMutation.isPending}
                disabled={importNumberMutation.isPending}>
                {t("create")}
              </Button>
            </BaseDialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      {agentId && (
        <TestPhoneCallDialog
          open={isTestAgentDialogOpen}
          onOpenChange={setIsTestAgentDialogOpen}
          agentId={agentId}
          teamId={teamId}
          form={form}
        />
      )}

      {agentId && (
        <WebCallDialog
          open={isWebCallDialogOpen}
          onOpenChange={setIsWebCallDialogOpen}
          agentId={agentId}
          teamId={teamId}
          isOrganization={isOrganization}
          form={form}
        />
      )}

      <UIDialog open={cancellingNumberId !== null} onOpenChange={() => setCancellingNumberId(null)}>
        <ConfirmationDialogContent
          isPending={cancelSubscriptionMutation.isPending}
          variety="danger"
          title={t("cancel_phone_number_subscription")}
          confirmBtnText={t("yes_cancel_subscription")}
          onConfirm={confirmCancelSubscription}>
          {t("cancel_phone_number_subscription_confirmation")}
        </ConfirmationDialogContent>
      </UIDialog>

      <UIDialog open={numberToDelete !== null} onOpenChange={() => setNumberToDelete(null)}>
        <ConfirmationDialogContent
          isPending={deletePhoneNumberMutation.isPending}
          variety="danger"
          title={t("delete_phone_number")}
          confirmBtnText={t("yes_delete_phone_number")}
          onConfirm={confirmDeletePhoneNumber}>
          {t("delete_phone_number_confirmation")}
        </ConfirmationDialogContent>
      </UIDialog>

      {/* <ToolsDialog
        open={toolDialogOpen}
        onOpenChange={setToolDialogOpen}
        toolDraft={toolDraft}
        setToolDraft={setToolDraft}
        onSave={handleToolDialogSave}
        isEditing={editingToolIndex !== null}
      /> */}
    </>
  );
}

// const ToolsDialog = ({
//   open,
//   onOpenChange,
//   toolDraft,
//   setToolDraft,
//   onSave,
//   isEditing,
// }: {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   toolDraft: ToolDraft | null;
//   setToolDraft: (draft: ToolDraft) => void;
//   onSave: () => void;
//   isEditing: boolean;
// }) => {
//   const { t } = useLocale();

//   const TOOL_TYPES = [
//     { label: t("Check Availability"), value: "check_availability_cal" },
//     { label: t("Book Appointment"), value: "book_appointment_cal" },
//     { label: t("End Call"), value: "end_call" },
//   ];

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent
//         enableOverflow
//         title={isEditing ? t("Edit Function") : t("Add Function")}
//         type="creation">
//         <div className="flex flex-col gap-4">
//           <div>
//             <Label>{t("Type")}</Label>
//             <Select
//               options={TOOL_TYPES}
//               value={TOOL_TYPES.find((opt) => opt.value === toolDraft?.type) || null}
//               onChange={(option) => setToolDraft((d: ToolDraft) => ({ ...d, type: option?.value || "" }))}
//               placeholder={t("Select function type")}
//             />
//           </div>
//           <div>
//             <Label>{t("Name")}</Label>
//             <TextField
//               required
//               value={toolDraft?.name || ""}
//               onChange={(e) => setToolDraft((d: ToolDraft) => ({ ...d, name: e.target.value }))}
//               placeholder={t("Enter function name")}
//             />
//           </div>
//           <div>
//             <Label>{t("Description")}</Label>
//             <TextArea
//               value={toolDraft?.description || ""}
//               onChange={(e) => setToolDraft((d: ToolDraft) => ({ ...d, description: e.target.value }))}
//               placeholder={t("Enter description (optional)")}
//             />
//           </div>
//           {(toolDraft?.type === "check_availability_cal" || toolDraft?.type === "book_appointment_cal") && (
//             <>
//               <div>
//                 <Label>
//                   {t("API Key (Cal.com)")}
//                   <span className="text-red-500"> *</span>
//                 </Label>
//                 <TextField
//                   required
//                   value={toolDraft?.cal_api_key || ""}
//                   onChange={(e) => setToolDraft((d: ToolDraft) => ({ ...d, cal_api_key: e.target.value }))}
//                   placeholder={t("Enter Cal.com API key")}
//                 />
//               </div>
//               <div>
//                 <Label>
//                   {t("Event Type ID (Cal.com)")}
//                   <span className="text-red-500"> *</span>
//                 </Label>
//                 <TextField
//                   required
//                   value={toolDraft?.event_type_id || ""}
//                   onChange={(e) =>
//                     setToolDraft((d: ToolDraft) => ({
//                       ...d,
//                       event_type_id: e.target.value ? Number(e.target.value) : null,
//                     }))
//                   }
//                   placeholder={t("Enter Event Type ID")}
//                   type="number"
//                 />
//               </div>
//               <div>
//                 <Label>
//                   {t("Timezone")}
//                   <span className="text-red-500"> *</span>
//                 </Label>
//                 <TextField
//                   required
//                   value={toolDraft?.timezone || ""}
//                   onChange={(e) => setToolDraft((d: ToolDraft) => ({ ...d, timezone: e.target.value }))}
//                   placeholder={t("America/Los_Angeles")}
//                 />
//                 <p className="mt-1 text-xs text-subtle">{t("Required for Cal.com calendar integration")}</p>
//               </div>
//             </>
//           )}
//         </div>
//         <DialogFooter showDivider>
//           <Button type="button" color="secondary" onClick={() => onOpenChange(false)}>
//             {t("Cancel")}
//           </Button>
//           <Button type="button" onClick={onSave}>
//             {t("Save")}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };
