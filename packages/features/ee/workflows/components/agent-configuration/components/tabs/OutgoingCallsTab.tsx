import { useState } from "react";
import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { Label, Select } from "@calcom/ui/components/form";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui/components/form";

import { VoiceSelectionDialog } from "../../../VoiceSelectionDialog";
import type { AgentFormValues } from "../../types/schemas";
import { AgentConfigForm } from "../forms/AgentConfigForm";

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
  const { t } = useLocale();

  return (
    <>
      {trigger === "FORM_SUBMITTED" && (
        <div>
          <Label className="text-emphasis mb-1 block text-sm font-medium">{t("event_type")}</Label>
          <p className="text-subtle mb-1.5 text-xs">{t("select_event_type_for_outbound_calls")}</p>
          <Controller
            name="outboundEventTypeId"
            control={outboundAgentForm.control}
            render={({ field }) => (
              <Select
                isSearchable={false}
                innerClassNames={{ valueContainer: "font-medium" }}
                value={eventTypeOptions.find((option) => option.value === field.value?.toString())}
                onChange={(option) => field.onChange(option?.value ? parseInt(option.value) : undefined)}
                options={eventTypeOptions}
                isDisabled={readOnly}
                placeholder={t("select_event_type")}
                className="mb-4"
              />
            )}
          />
        </div>
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
