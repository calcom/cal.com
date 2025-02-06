import { DataTableSelectionBar } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { ConfirmationDialogContent, Dialog, DialogTrigger, showToast } from "@calcom/ui";

import type { User } from "./MemberList";

interface Props {
  users: User[];
  onRemove: () => void;
  isOrg: boolean;
  teamId: number;
}

export default function DeleteBulkTeamMembers({ users, onRemove, isOrg, teamId }: Props) {
  const { t } = useLocale();
  const selectedRows = users; // Get selected rows from table
  const utils = trpc.useUtils();
  const deleteMutation = trpc.viewer.teams.removeMember.useMutation({
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.eventTypes.invalidate();
      await utils.viewer.organizations.listMembers.invalidate();
      await utils.viewer.organizations.getMembers.invalidate();
      showToast("Deleted Users", "success");
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });
  return (
    <Dialog>
      <DialogTrigger asChild>
        <DataTableSelectionBar.Button icon="ban">{t("Delete")}</DataTableSelectionBar.Button>
      </DialogTrigger>
      <ConfirmationDialogContent
        variety="danger"
        title={t("remove_users_from_team")}
        confirmBtnText={t("remove")}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate({
            teamIds: [teamId],
            memberIds: selectedRows.map((user) => user.id),
            isOrg,
          });
          onRemove();
        }}>
        <p className="mt-5">
          {t("remove_users_from_team_confirm", {
            userCount: selectedRows.length,
          })}
        </p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
