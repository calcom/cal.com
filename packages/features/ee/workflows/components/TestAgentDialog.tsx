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
      showToast(data.message || t("Call initiated!"), "success");
      onOpenChange(false);
      setTestPhoneNumber("");
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const handleTestCall = () => {
    if (!testPhoneNumber) {
      showToast(t("Please enter a phone number"), "error");
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
        title={t("Test Cal.Ai Agent")}
        description={t("Make a test call to verify your configuration")}>
        <div>
          <Label className="mb-1 block text-sm font-medium">{t("Call to")}:</Label>
          <PhoneInput
            placeholder={t("Enter phone number to test call")}
            value={testPhoneNumber}
            onChange={(val) => setTestPhoneNumber(val || "")}
            disabled={testCallMutation.isPending}
          />
        </div>
        <DialogFooter showDivider>
          <Button type="button" color="secondary" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleTestCall}
            loading={testCallMutation.isPending}
            disabled={!testPhoneNumber}>
            <Icon name="phone" className="mr-2 h-4 w-4" />
            {t("Make Test Call")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
