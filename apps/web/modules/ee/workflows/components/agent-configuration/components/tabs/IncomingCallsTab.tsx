"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { FormValues } from "@calcom/features/ee/workflows/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Label, Select } from "@calcom/ui/components/form";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

import { VoiceSelectionDialog } from "../../../VoiceSelectionDialog";
import type { AgentFormValues } from "../../types/schemas";
import { AgentConfigForm } from "../forms/AgentConfigForm";

interface IncomingCallsTabProps {
  agentData?: RouterOutputs["viewer"]["aiVoiceAgent"]["get"];
  inboundAgentData?: RouterOutputs["viewer"]["aiVoiceAgent"]["get"];
  inboundAgentId?: string | null;
  inboundAgentForm: UseFormReturn<AgentFormValues>;
  form: UseFormReturn<FormValues>;
  eventTypeOptions: Option[];
  readOnly?: boolean;
  teamId?: number;
  workflowStepId?: number;
}

export function IncomingCallsTab({
  agentData,
  inboundAgentData,
  inboundAgentId,
  inboundAgentForm,
  form,
  eventTypeOptions,
  readOnly = false,
  teamId,
  workflowStepId,
}: IncomingCallsTabProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);

  const setupInboundAgentMutation = trpc.viewer.aiVoiceAgent.setupInboundAgent.useMutation({
    onSuccess: async (data) => {
      showToast(t("inbound_agent_setup_success"), "success");
      // Update the form with the new inbound agent ID
      if (data.agentId && form && workflowStepId) {
        const stepIndex = form.getValues("steps")?.findIndex((s) => s.id === workflowStepId);
        if (stepIndex !== undefined && stepIndex !== -1) {
          form.setValue(`steps.${stepIndex}.inboundAgentId`, data.agentId, { shouldDirty: true });
        }
      }

      // Invalidate and refetch the agent data
      if (data.agentId) {
        await utils.viewer.aiVoiceAgent.get.invalidate({ id: data.agentId });
      }
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const updateInboundAgentEventTypeMutation =
    trpc.viewer.aiVoiceAgent.updateInboundAgentEventType.useMutation({
      onSuccess: async () => {
        showToast(t("agent_event_type_updated_successfully"), "success");
        if (inboundAgentId) {
          await utils.viewer.aiVoiceAgent.get.invalidate({ id: inboundAgentId });
        }
      },
      onError: (error: { message: string }) => {
        showToast(error.message, "error");
      },
    });

  const hasActivePhoneNumbers =
    agentData?.outboundPhoneNumbers &&
    agentData.outboundPhoneNumbers.filter(
      (phone) =>
        phone.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE || !phone.subscriptionStatus
    ).length > 0;

  if (!hasActivePhoneNumbers) {
    return (
      <div className="border-subtle rounded-xl border p-8">
        <div className="stack-y-6 flex flex-col items-center text-center">
          <div className="bg-cal-muted flex h-16 w-16 items-center justify-center rounded-lg">
            <Icon name="info" className="text-subtle h-8 w-8" />
          </div>
          <div className="stack-y-2">
            <h3 className="text-emphasis text-lg font-semibold">{t("setup_incoming_agent")}</h3>
            <p className="text-subtle text-sm">{t("connect_a_phone_number_first")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!inboundAgentId) {
    return (
      <div className="border-subtle rounded-xl border p-8">
        <div className="stack-y-6 flex flex-col items-center text-center">
          <div className="bg-cal-muted flex h-16 w-16 items-center justify-center rounded-lg">
            <Icon name="phone-incoming" className="text-subtle h-8 w-8" />
          </div>
          <div className="stack-y-2">
            <h3 className="text-emphasis text-lg font-semibold">{t("setup_inbound_agent")}</h3>
            <p className="text-subtle text-sm">{t("setup_inbound_agent_for_incoming_calls")}</p>
          </div>
          <Button
            onClick={() => {
              const phoneNumber = agentData?.outboundPhoneNumbers?.filter(
                (phone) =>
                  phone.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE ||
                  !phone.subscriptionStatus
              )[0]?.phoneNumber;

              if (!phoneNumber) {
                showToast(t("no_active_phone_number_available"), "error");
                return;
              }
              if (!workflowStepId) {
                showToast(t("workflow_step_not_configured"), "error");
                return;
              }

              setupInboundAgentMutation.mutate({
                phoneNumber,
                teamId,
                workflowStepId: workflowStepId,
              });
            }}
            className="px-6"
            loading={setupInboundAgentMutation.isPending}
            disabled={setupInboundAgentMutation.isPending || !workflowStepId}>
            {t("setup_inbound_agent")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack-y-4">
      <div>
        <Label className="text-emphasis mb-1 block text-sm font-medium">{t("event_type")}</Label>
        <p className="text-subtle mb-1.5 text-xs">{t("select_event_type_for_inbound_calls")}</p>
        <Select
          isSearchable={false}
          innerClassNames={{ valueContainer: "font-medium" }}
          className="text-sm font-medium"
          isDisabled={readOnly || updateInboundAgentEventTypeMutation.isPending}
          isLoading={updateInboundAgentEventTypeMutation.isPending}
          onChange={(val) => {
            if (val && inboundAgentId) {
              updateInboundAgentEventTypeMutation.mutate({
                agentId: inboundAgentId,
                eventTypeId: parseInt(val.value),
                teamId,
              });
            }
          }}
          value={eventTypeOptions.find(
            (opt) => opt.value === inboundAgentData?.inboundEventTypeId?.toString()
          )}
          options={eventTypeOptions}
          placeholder={t("select_event_type")}
        />
      </div>

      <AgentConfigForm
        form={inboundAgentForm}
        readOnly={readOnly}
        selectedVoiceId={inboundAgentForm.watch("voiceId")}
        onVoiceDialogOpen={() => setIsVoiceDialogOpen(true)}
      />

      <VoiceSelectionDialog
        open={isVoiceDialogOpen}
        onOpenChange={setIsVoiceDialogOpen}
        selectedVoiceId={inboundAgentForm.watch("voiceId")}
        onVoiceSelect={(voiceId: string) => {
          inboundAgentForm.setValue("voiceId", voiceId, { shouldDirty: true });
        }}
      />
    </div>
  );
}
