"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { DropdownItem } from "@calcom/ui/components/dropdown";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { revalidateTeamRoles } from "../actions";

interface DeleteRoleModalProps {
  roleId: string;
  roleName: string;
  teamId: number;
  onDeleted?: () => void;
}

export function DeleteRoleModal({ roleId, roleName, teamId, onDeleted }: DeleteRoleModalProps) {
  const { t } = useLocale();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const deleteMutation = trpc.viewer.pbac.deleteRole.useMutation({
    onSuccess: async () => {
      showToast(t("role_deleted_successfully"), "success");
      setIsModalOpen(false);
      await revalidateTeamRoles(teamId);
      router.refresh();
      onDeleted?.();
    },
    onError: (error) => {
      showToast(error.message || t("error_deleting_role"), "error");
    },
  });

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DropdownItem StartIcon="trash" color="destructive" onClick={() => setIsModalOpen(true)}>
        {t("delete")}
      </DropdownItem>
      <ConfirmationDialogContent
        variety="danger"
        title={t("delete_role")}
        confirmBtnText={t("delete")}
        cancelBtnText={t("cancel")}
        onConfirm={() => {
          deleteMutation.mutate({
            teamId,
            roleId,
          });
        }}
        loadingText={t("deleting_role")}>
        <p className="mb-4">
          {t("confirm_delete_role", {
            roleName,
          })}
        </p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
