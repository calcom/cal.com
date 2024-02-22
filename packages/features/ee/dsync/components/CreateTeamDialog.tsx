import { CreateANewTeamForm } from "@calcom/features/ee/teams/components";
import { Dialog, DialogContent } from "@calcom/ui";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateTeamDialog = (props: CreateTeamDialogProps) => {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        type="creation"
        title="Create a new team"
        description="New teams will be under your organization">
        <CreateANewTeamForm
          inDialog
          submitLabel="Create"
          onCancel={() => onOpenChange(false)}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CreateTeamDialog;
