import { useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { PasswordConfirmationDialogContent } from "@calcom/features/components/PasswordConfirmationDialogContent";
import { DataTableSelectionBar } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { DialogTrigger } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";

import type { UserTableUser } from "../types";

interface Props {
  users: Array<{ id: UserTableUser["id"] }>;
  onRemove: () => void;
}

export function DeleteBulkUsers({ users, onRemove }: Props) {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const selectedRows = users; // Get selected rows from table
  const utils = trpc.useUtils();
  const deleteMutation = trpc.viewer.organizations.bulkDeleteUsers.useMutation({
    onSuccess: () => {
      showToast("Deleted Users", "success");
      utils.viewer.organizations.listMembers.invalidate();
      setIsOpen(false);
      onRemove();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <DataTableSelectionBar.Button icon="ban" color="destructive">
          {t("Delete")}
        </DataTableSelectionBar.Button>
      </DialogTrigger>
      <PasswordConfirmationDialogContent
        variety="danger"
        title={t("remove_users_from_org")}
        confirmBtnText={t("remove")}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate({
            userIds: selectedRows.map((user) => user.id),
          });
        }}>
        <p className="mt-5">
          {t("remove_users_from_org_confirm", {
            userCount: selectedRows.length,
          })}
        </p>
      </PasswordConfirmationDialogContent>
    </Dialog>
  );
}
