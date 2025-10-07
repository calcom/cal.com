import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui/components/form";

import { VoiceSelectionDialog } from "../../../VoiceSelectionDialog";
import type { AgentFormValues } from "../../types/schemas";
import { AgentConfigForm } from "../forms/AgentConfigForm";

interface OutgoingCallsTabProps {
  outboundAgentForm: UseFormReturn<AgentFormValues>;
  readOnly?: boolean;
  eventTypeOptions?: Option[];
}

export function OutgoingCallsTab({
  outboundAgentForm,
  readOnly = false,
  eventTypeOptions = [],
}: OutgoingCallsTabProps) {
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);

  return (
    <>
      <AgentConfigForm
        form={outboundAgentForm}
        readOnly={readOnly}
        selectedVoiceId={outboundAgentForm.watch("voiceId")}
        onVoiceDialogOpen={() => setIsVoiceDialogOpen(true)}
        eventTypeOptions={eventTypeOptions}
        callType="outgoing"
      />

      <VoiceSelectionDialog
        open={isVoiceDialogOpen}
        onOpenChange={setIsVoiceDialogOpen}
        selectedVoiceId={outboundAgentForm.watch("voiceId")}
        onVoiceSelect={(voiceId: string) => {
          outboundAgentForm.setValue("voiceId", voiceId, { shouldDirty: true });
        }}
      />
    </>
  );
}
