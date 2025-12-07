import { useSession } from "next-auth/react";
import { useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { PasswordConfirmationDialogContent } from "@calcom/features/components/PasswordConfirmationDialogContent";
import { DataTableSelectionBar } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { IdentityProvider } from "@calcom/prisma/enums";
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
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const selectedRows = users; // Get selected rows from table
  const utils = trpc.useUtils();

  const isCALIdentityProvider = session?.user.identityProvider === IdentityProvider.CAL;

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

  const handleConfirm = () => {
    deleteMutation.mutate({
      userIds: selectedRows.map((user) => user.id),
    });
  };

  const confirmationContent = (
    <p className="mt-5">
      {t("remove_users_from_org_confirm", {
        userCount: selectedRows.length,
      })}
    </p>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <DataTableSelectionBar.Button icon="ban" color="destructive">
          {t("Delete")}
        </DataTableSelectionBar.Button>
      </DialogTrigger>
      {isCALIdentityProvider ? (
        <PasswordConfirmationDialogContent
          variety="danger"
          title={t("remove_users_from_org")}
          confirmBtnText={t("remove")}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirm}>
          {confirmationContent}
        </PasswordConfirmationDialogContent>
      ) : (
        <ConfirmationDialogContent
          variety="danger"
          title={t("remove_users_from_org")}
          confirmBtnText={t("remove")}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirm}>
          {confirmationContent}
        </ConfirmationDialogContent>
      )}
    </Dialog>
  );
}
