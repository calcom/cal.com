import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui/components/form";

import { VoiceSelectionDialog } from "../../../VoiceSelectionDialog";
import type { AgentFormValues } from "../../types/schemas";
import { AgentConfigForm } from "../forms/AgentConfigForm";
import { EventTypeSelector } from "../forms/EventTypeSelector";

interface OutgoingCallsTabProps {
  outboundAgentForm: UseFormReturn<AgentFormValues>;
  readOnly?: boolean;
  eventTypeOptions?: Option[];
  trigger?: WorkflowTriggerEvents;
}

export function OutgoingCallsTab({
  outboundAgentForm,
  readOnly = false,
  eventTypeOptions = [],
  trigger,
}: OutgoingCallsTabProps) {
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);

  return (
    <>
      {trigger === "FORM_SUBMITTED" && (
        <EventTypeSelector
          control={outboundAgentForm.control}
          name="eventTypeId"
          disabled={readOnly}
          eventTypeOptions={eventTypeOptions}
          callType="outgoing"
        />
      )}

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
