import { Button } from "@calid/features/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calid/features/ui/components/dialog";
import { Icon } from "@calid/features/ui/components/icon";
import { Label } from "@calid/features/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@calid/features/ui/components/radio-group";
import type { Dispatch, SetStateAction } from "react";
import { useState, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

interface Team {
  id: number;
  name?: string | null;
  slug?: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
}

interface WorkflowCreateDialogProps {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  teams: Team[];
  onCreateWorkflow: (teamId?: number) => void;
  isCreating: boolean;
}

export const WorkflowCreateDialog = ({
  isOpenDialog,
  setIsOpenDialog,
  teams,
  onCreateWorkflow,
  isCreating,
}: WorkflowCreateDialogProps) => {
  const { t } = useLocale();
  const [selectedOption, setSelectedOption] = useState<string>("personal");

  const filteredTeams = teams.filter((team) => team.id && team.role !== "MEMBER");

  // Reset selection when dialog opens
  useEffect(() => {
    if (isOpenDialog) {
      setSelectedOption("personal");
    }
  }, [isOpenDialog]);

  const handleConfirm = () => {
    if (selectedOption === "personal") {
      onCreateWorkflow(undefined);
    } else {
      const teamId = parseInt(selectedOption);
      if (!isNaN(teamId)) {
        onCreateWorkflow(teamId);
      }
    }
    // Dialog will be closed by the parent component after successful creation
  };

  const handleCancel = () => {
    if (!isCreating) {
      setIsOpenDialog(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isCreating) {
      setIsOpenDialog(open);
    }
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={handleOpenChange}>
      <DialogContent
        title={t("create_workflow")}
        description={t("choose_where_to_create_workflow")}
        Icon="plus"
        size="sm"
        preventCloseOnOutsideClick>
        <div className="mt-4">
          <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
            {/* Personal Account Option */}
            <div className="hover:bg-muted/50 flex items-center space-x-3 rounded-lg border p-4 transition-colors">
              <RadioGroupItem value="personal" id="personal" />
              <Label htmlFor="personal" className="flex-1 cursor-pointer font-medium">
                <div className="flex items-center gap-2">
                  <Icon name="user" className="h-4 w-4" />
                  {t("personal_account")}
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t("create_workflow_personal_description", "Create workflow under your personal account")}
                </p>
              </Label>
            </div>

            {/* Team Options */}
            {filteredTeams.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-muted-foreground mb-2 mt-4 text-sm font-medium">
                  {t("or_choose_team", "Or choose a team")}
                </p>
                {filteredTeams.map((team) => (
                  <div
                    key={team.id}
                    className="hover:bg-muted/50 flex items-center space-x-3 rounded-lg border p-4 transition-colors">
                    <RadioGroupItem value={team.id.toString()} id={`team-${team.id}`} />
                    <Label htmlFor={`team-${team.id}`} className="flex-1 cursor-pointer font-medium">
                      <div className="flex items-center gap-2">
                        <Icon name="users" className="h-4 w-4" />
                        {team.name || team.slug || `Team ${team.id}`}
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {t("create_workflow_team_description", "Create workflow under this team")}
                      </p>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </RadioGroup>
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button color="secondary" onClick={handleCancel} disabled={isCreating}>
            {t("cancel")}
          </Button>
          <Button color="primary" onClick={handleConfirm} disabled={isCreating} className="gap-2">
            {isCreating && <Icon name="loader-circle" className="h-4 w-4 animate-spin" />}
            {t("create_workflow")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
