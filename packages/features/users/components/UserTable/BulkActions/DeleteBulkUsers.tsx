import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, ConfirmationDialogContent, Dialog, DialogTrigger, showToast } from "@calcom/ui";

import type { User } from "../UserListTable";

interface Props {
  users: User[];
  onRemove: () => void;
}

export function DeleteBulkUsers({ users, onRemove }: Props) {
  const { t } = useLocale();
  const selectedRows = users; // Get selected rows from table
  const utils = trpc.useUtils();
  const deleteMutation = trpc.viewer.organizations.bulkDeleteUsers.useMutation({
    onSuccess: () => {
      utils.viewer.organizations.listMembers.invalidate();
      showToast("Deleted Users", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button StartIcon="ban">{t("Delete")}</Button>
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
