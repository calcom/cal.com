import type { Language } from "@calcom/features/calAIPhone/providers/retellAI/types";
import { restorePromptComplexity } from "@calcom/features/calAIPhone/providers/retellAI/utils/promptUtils";
import type { FormValues } from "@calcom/features/ee/workflows/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui/components/form";
import { ToggleGroup } from "@calcom/ui/components/form";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { WebCallDialog } from "../WebCallDialog";
import { IncomingCallsTab } from "./components/tabs/IncomingCallsTab";
import { OutgoingCallsTab } from "./components/tabs/OutgoingCallsTab";
import { PhoneNumberTab } from "./components/tabs/PhoneNumberTab";
import { useAgentForms } from "./hooks/useAgentForms";
import type { AgentFormValues } from "./types/schemas";

type AgentConfigurationSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId?: string | null;
  inboundAgentId?: string | null;
  agentData?: RouterOutputs["viewer"]["aiVoiceAgent"]["get"];
  inboundAgentData?: RouterOutputs["viewer"]["aiVoiceAgent"]["get"];
  onUpdate: (data: AgentFormValues & { id: string }) => void;
  readOnly?: boolean;
  teamId?: number;
  isOrganization?: boolean;
  workflowId?: string;
  workflowStepId?: number;
  activeTab?: "outgoingCalls" | "phoneNumber" | "incomingCalls";
  form: UseFormReturn<FormValues>;
  eventTypeOptions?: Option[];
};

export function AgentConfigurationSheet({
  open,
  activeTab: _activeTab,
  onOpenChange,
  agentId,
  inboundAgentId,
  agentData,
  inboundAgentData,
  readOnly = false,
  teamId,
  isOrganization = false,
  workflowId,
  workflowStepId,
  form,
  eventTypeOptions = [],
}: AgentConfigurationSheetProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<"outgoingCalls" | "phoneNumber" | "incomingCalls">(
    _activeTab ?? "outgoingCalls"
  );
  const [isWebCallDialogOpen, setIsWebCallDialogOpen] = useState(false);

  const activeAgentId = activeTab === "incomingCalls" ? inboundAgentId : agentId;

  const { outboundAgentForm, inboundAgentForm } = useAgentForms({ agentData, inboundAgentData });

  const trigger = form.watch("trigger");

  const updateAgentMutation = trpc.viewer.aiVoiceAgent.update.useMutation({
    onSuccess: async () => {
      if (activeAgentId) {
        await utils.viewer.aiVoiceAgent.get.invalidate({ id: activeAgentId });
      }
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const handleAgentUpdate = async (data: AgentFormValues) => {
    if (!agentId) return;
    if (trigger === "FORM_SUBMITTED" && !data.outboundEventTypeId) {
      showToast(t("select_event_type_to_schedule_calls"), "error");
      return;
    }

    const updatePayload = {
      generalPrompt: restorePromptComplexity(data.generalPrompt),
      beginMessage: data.beginMessage,
      language: data.language as Language,
      voiceId: data.voiceId,
      outboundEventTypeId: data.outboundEventTypeId,
    };

    await updateAgentMutation.mutateAsync({
      id: agentId,
      teamId: teamId,
      ...updatePayload,
    });
  };

  const handleInboundAgentUpdate = async (data: AgentFormValues) => {
    if (!inboundAgentId) return;

    const updatePayload = {
      generalPrompt: restorePromptComplexity(data.generalPrompt),
      beginMessage: data.beginMessage,
      language: data.language as Language,
      voiceId: data.voiceId,
    };

    await updateAgentMutation.mutateAsync({
      id: inboundAgentId,
      teamId: teamId,
      ...updatePayload,
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader showCloseButton={false} className="w-full">
            <SheetTitle className="mb-6">{t("cal_ai_agent_configuration")}</SheetTitle>
            <ToggleGroup
              onValueChange={(val) => {
                setActiveTab((val || "outgoingCalls") as "outgoingCalls" | "phoneNumber" | "incomingCalls");
              }}
              value={activeTab}
              options={[
                { value: "outgoingCalls", label: t("outgoing_calls") },
                { value: "phoneNumber", label: t("phone_number") },
                { value: "incomingCalls", label: t("incoming_calls") },
              ]}
              isFullWidth={true}
            />
          </SheetHeader>
          <SheetBody className="px-0">
            {activeTab === "outgoingCalls" && (
              <OutgoingCallsTab
                outboundAgentForm={outboundAgentForm}
                readOnly={readOnly}
                eventTypeOptions={eventTypeOptions}
                trigger={trigger}
              />
            )}

            {activeTab === "phoneNumber" && (
              <PhoneNumberTab
                agentData={agentData}
                agentId={agentId}
                readOnly={readOnly}
                teamId={teamId}
                workflowId={workflowId}
                isOrganization={isOrganization}
                form={form}
                eventTypeIds={eventTypeOptions?.map((opt) => parseInt(opt.value, 10))}
              />
            )}

            {activeTab === "incomingCalls" && (
              <IncomingCallsTab
                agentData={agentData}
                inboundAgentData={inboundAgentData}
                inboundAgentId={inboundAgentId}
                inboundAgentForm={inboundAgentForm}
                form={form}
                eventTypeOptions={eventTypeOptions}
                readOnly={readOnly}
                teamId={teamId}
                workflowStepId={workflowStepId}
              />
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
              onClick={() => {
                if (activeTab === "incomingCalls" && inboundAgentId) {
                  inboundAgentForm.handleSubmit(handleInboundAgentUpdate)();
                } else if (activeTab === "outgoingCalls" && agentId) {
                  outboundAgentForm.handleSubmit(handleAgentUpdate)();
                }
              }}
              disabled={
                readOnly ||
                updateAgentMutation.isPending ||
                (activeTab === "outgoingCalls" && !outboundAgentForm.formState.isDirty) ||
                (activeTab === "incomingCalls" && !inboundAgentForm.formState.isDirty) ||
                (activeTab === "outgoingCalls" && !agentId) ||
                (activeTab === "incomingCalls" && !inboundAgentId)
              }
              loading={updateAgentMutation.isPending}>
              {t("save")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {activeAgentId && (
        <WebCallDialog
          open={isWebCallDialogOpen}
          onOpenChange={setIsWebCallDialogOpen}
          agentId={activeAgentId}
          teamId={teamId}
          isOrganization={isOrganization}
          form={form}
          eventTypeIds={eventTypeOptions?.map((opt) => parseInt(opt.value, 10))}
          outboundEventTypeId={agentData?.outboundEventTypeId}
        />
      )}

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
