import { useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import PhoneInput from "@calcom/features/components/phone-input";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Label } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

interface TestAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  teamId?: number;
}

export function TestAgentDialog({ open, onOpenChange, agentId, teamId }: TestAgentDialogProps) {
  const { t } = useLocale();
  const [testPhoneNumber, setTestPhoneNumber] = useState("");

  const testCallMutation = trpc.viewer.ai.testCall.useMutation({
    onSuccess: async (data) => {
      showToast(data.message || t("call_initiated_successfully"), "success");
      onOpenChange(false);
      setTestPhoneNumber("");
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const handleTestCall = () => {
    if (!testPhoneNumber) {
      showToast(t("please_enter_phone_number"), "error");
      return;
    }
    if (agentId) {
      testCallMutation.mutate({
        agentId: agentId,
        phoneNumber: testPhoneNumber,
        teamId: teamId,
      });
    }
  };

  return (
    // Without modal={false}, the screen freezes when Sheet is open
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
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
