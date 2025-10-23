import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import PhoneInput from "@calcom/features/components/phone-input";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Label } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

import type { FormValues } from "../pages/workflow";

interface TestPhoneCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  teamId?: number;
  form: UseFormReturn<FormValues>;
  outboundEventTypeId?: number | null;
}

export function TestPhoneCallDialog({
  open,
  onOpenChange,
  agentId,
  teamId,
  form,
  outboundEventTypeId,
}: TestPhoneCallDialogProps) {
  const { t } = useLocale();
  const [testPhoneNumber, setTestPhoneNumber] = useState("");

  const testCallMutation = trpc.viewer.aiVoiceAgent.testCall.useMutation({
    onSuccess: async (data) => {
      showToast(data?.message ?? t("call_initiated_successfully"), "success");
      onOpenChange(false);
      setTestPhoneNumber("");
    },
    onError: (error: { message: string }) => {
      showToast(t(error.message), "error");
    },
  });

  const handleTestCall = () => {
    if (!testPhoneNumber) {
      showToast(t("please_enter_phone_number"), "error");
      return;
    }

    const eventTypeId = outboundEventTypeId ?? form.getValues("activeOn")?.[0]?.value;

    if (!eventTypeId) {
      const trigger = form.getValues("trigger");
      if (trigger === WorkflowTriggerEvents.FORM_SUBMITTED) {
        showToast("choose_event_type_in_agent_setup", "error");
      } else {
        showToast(t("choose_at_least_one_event_type_test_call"), "error");
      }
      return;
    }

    if (agentId) {
      testCallMutation.mutate({
        agentId: agentId,
        phoneNumber: testPhoneNumber,
        teamId: teamId,
        eventTypeId: typeof eventTypeId === "string" ? parseInt(eventTypeId, 10) : eventTypeId,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        type="creation"
        title={t("test_cal_ai_agent")}
        description={t("make_test_call_to_verify_configuration")}>
        <div>
          <Label className="mb-1 block text-sm font-medium">{t("call_to")}:</Label>
          <PhoneInput
            placeholder={t("enter_phone_number_to_test_call")}
            value={testPhoneNumber}
            onChange={(val) => setTestPhoneNumber(val || "")}
            disabled={testCallMutation.isPending}
          />
        </div>
        <DialogFooter showDivider>
          <Button type="button" color="secondary" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleTestCall}
            loading={testCallMutation.isPending}
            disabled={!testPhoneNumber}>
            <Icon name="phone" className="mr-2 h-4 w-4" />
            {t("make_test_call")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
