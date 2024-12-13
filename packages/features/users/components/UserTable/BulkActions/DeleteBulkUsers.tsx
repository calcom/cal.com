import { DataTableSelectionBar } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { ConfirmationDialogContent, Dialog, DialogTrigger, showToast } from "@calcom/ui";

import type { UserTableUser } from "../types";

interface Props {
  users: UserTableUser[];
  onRemove: () => void;
}

export function DeleteBulkUsers({ users, onRemove }: Props) {
  const { t } = useLocale();
  const selectedRows = users; // Get selected rows from table
  const utils = trpc.useUtils();
  const deleteMutation = trpc.viewer.organizations.bulkDeleteUsers.useMutation({
    onSuccess: (_, { userIds }) => {
      showToast("Deleted Users", "success");
      utils.viewer.organizations.listMembers.setInfiniteData(
        { limit: 10, searchTerm: "", expand: ["attributes"] },
        // @ts-expect-error - infinite data types are not correct
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              rows: page.rows.filter((user) => !userIds.includes(user.id)),
            })),
          };
        }
      );
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });
  return (
    <Dialog>
      <DialogTrigger asChild>
        <DataTableSelectionBar.Button icon="ban">{t("Delete")}</DataTableSelectionBar.Button>
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
