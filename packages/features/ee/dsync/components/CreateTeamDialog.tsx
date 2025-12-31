import type { ComponentType } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { DialogContent } from "@calcom/ui/components/dialog";

interface CreateANewTeamFormProps {
  inDialog?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
  onSuccess?: () => void | Promise<void>;
}

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  CreateANewTeamForm: ComponentType<CreateANewTeamFormProps>;
  onSuccess?: () => void;
}

const CreateTeamDialog = (props: CreateTeamDialogProps) => {
  const { open, onOpenChange, CreateANewTeamForm, onSuccess } = props;
  const { t } = useLocale();

  const utils = trpc.useUtils();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent type="creation" title={t("create_new_team")} description={t("team_will_be_under_org")}>
        <CreateANewTeamForm
          inDialog
          submitLabel="Create"
          onCancel={() => onOpenChange(false)}
          onSuccess={async () => {
            await utils.viewer.dsync.teamGroupMapping.get.invalidate();
            await utils.viewer.teams.list.invalidate();
            onSuccess?.();
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CreateTeamDialog;
