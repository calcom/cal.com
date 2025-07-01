import { Dialog } from "@calcom/features/components/controlled-dialog";
import { DataTableSelectionBar } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { DialogTrigger, ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";

import type { UserTableUser } from "../types";

interface Props {
  users: Array<{ id: UserTableUser["id"] }>;
  onRemove: () => void;
}

export function DeleteBulkUsers({ users, onRemove }: Props) {
  const { t } = useLocale();
  const selectedRows = users; // Get selected rows from table
  const utils = trpc.useUtils();
  const deleteMutation = trpc.viewer.organizations.bulkDeleteUsers.useMutation({
    onSuccess: () => {
      showToast("Deleted Users", "success");
      utils.viewer.organizations.listMembers.invalidate();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });
  return (
    <Dialog>
      <DialogTrigger asChild>
        <DataTableSelectionBar.Button icon="ban" color="destructive">
          {t("Delete")}
        </DataTableSelectionBar.Button>
      </DialogTrigger>
      <ConfirmationDialogContent
        variety="danger"
        title={t("remove_users_from_org")}
        confirmBtnText={t("remove")}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutateAsync({
            userIds: selectedRows.map((user) => user.id),
          });
          onRemove();
        }}>
        <p className="mt-5">
          {t("remove_users_from_org_confirm", {
            userCount: selectedRows.length,
          })}
        </p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
