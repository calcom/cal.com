import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Dialog, ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";

interface SkipTrialConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SkipTrialConfirmationModal({ isOpen, onClose }: SkipTrialConfirmationModalProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const skipTeamTrialsMutation = trpc.viewer.teams.skipTeamTrials.useMutation({
    onSuccess: () => {
      utils.viewer.teams.hasActiveTeamPlan.invalidate();
      showToast(t("team_trials_skipped_successfully"), "success");
      onClose();
    },
    onError: () => {
      showToast(t("something_went_wrong"), "error");
    },
  });

  const handleConfirm = () => {
    skipTeamTrialsMutation.mutate({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <ConfirmationDialogContent
        variety="warning"
        title={t("skip_trial_confirmation_title")}
        confirmBtnText={t("skip_trial")}
        cancelBtnText={t("cancel")}
        isPending={skipTeamTrialsMutation.isPending}
        onConfirm={handleConfirm}>
        <p>{t("skip_trial_confirmation_message")}</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
