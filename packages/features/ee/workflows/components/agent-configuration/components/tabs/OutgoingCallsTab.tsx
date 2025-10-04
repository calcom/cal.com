import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { VoiceSelectionDialog } from "../../../VoiceSelectionDialog";
import type { AgentFormValues } from "../../types/schemas";
import { AgentConfigForm } from "../forms/AgentConfigForm";

interface OutgoingCallsTabProps {
  outboundAgentForm: UseFormReturn<AgentFormValues>;
  readOnly?: boolean;
}

export function OutgoingCallsTab({ outboundAgentForm, readOnly = false }: OutgoingCallsTabProps) {
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);

  return (
    <>
      <AgentConfigForm
        form={outboundAgentForm}
        readOnly={readOnly}
        selectedVoiceId={outboundAgentForm.watch("voiceId")}
        onVoiceDialogOpen={() => setIsVoiceDialogOpen(true)}
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
