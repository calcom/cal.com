import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import type { Dispatch, SetStateAction } from "react";

interface IDeleteDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  workflowId: number;
  additionalFunction: () => Promise<boolean | void>;
}

export const DeleteDialog = (props: IDeleteDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, workflowId, additionalFunction } = props;
  const utils = trpc.useUtils();

  const deleteMutation = trpc.viewer.workflows.delete.useMutation({
    onSuccess: async () => {
      await utils.viewer.workflows.filteredList.invalidate();
      additionalFunction();
      showToast(t("workflow_deleted_successfully"), "success");
      setIsOpenDialog(false);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
        setIsOpenDialog(false);
      }
      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: You are not authorized to delete this workflow`;
        showToast(message, "error");
      }
    },
  });

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <ConfirmationDialogContent
        isPending={deleteMutation.isPending}
        variety="danger"
        title={t("delete_workflow")}
        confirmBtnText={t("confirm_delete_workflow")}
        loadingText={t("confirm_delete_workflow")}
        onConfirm={(e) => {
          e.preventDefault();
          deleteMutation.mutate({ id: workflowId });
        }}>
        {t("delete_workflow_description")}
      </ConfirmationDialogContent>
    </Dialog>
  );
};
