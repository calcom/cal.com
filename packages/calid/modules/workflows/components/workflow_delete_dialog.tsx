import { Button } from "@calid/features/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calid/features/ui/components/dialog";
import { Icon } from "@calid/features/ui/components/icon";
import { triggerToast } from "@calid/features/ui/components/toast";
import type { Dispatch, SetStateAction } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";

interface WorkflowDeleteDialogProps {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  workflowId: number;
  additionalFunction: () => Promise<boolean | void>;
}

export const WorkflowDeleteDialog = ({
  isOpenDialog,
  setIsOpenDialog,
  workflowId,
  additionalFunction,
}: WorkflowDeleteDialogProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.viewer.workflows.calid_delete.useMutation({
    onSuccess: async () => {
      try {
        await utils.viewer.workflows.calid_filteredList.invalidate();
        await additionalFunction();
        triggerToast(t("workflow_deleted_successfully"), "success");
      } catch (error) {
        console.error("Error in success handler:", error);
      } finally {
        setIsOpenDialog(false);
      }
    },
    onError: (err) => {
      let message = "An error occurred while deleting the workflow";

      if (err instanceof HttpError) {
        message = `${err.statusCode}: ${err.message}`;
      } else if (err.data?.code === "UNAUTHORIZED") {
        message = `${err.data.code}: You are not authorized to delete this workflow`;
      }

      triggerToast(message, "error");

      setIsOpenDialog(false);
    },
  });

  const handleConfirm = () => {
    deleteMutation.mutate({ id: workflowId });
  };

  const handleCancel = () => {
    if (!deleteMutation.isPending) {
      setIsOpenDialog(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!deleteMutation.isPending) {
      setIsOpenDialog(open);
    }
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={handleOpenChange}>
      <DialogContent
        type="confirmation"
        title={t("delete_workflow")}
        description={t("delete_workflow_description")}
        Icon="triangle-alert"
        size="sm"
        preventCloseOnOutsideClick>
        <DialogFooter className="mt-4 gap-2">
          <Button color="secondary" onClick={handleCancel} disabled={deleteMutation.isPending}>
            {t("cancel")}
          </Button>
          <Button
            color="destructive"
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
            className="gap-2">
            {deleteMutation.isPending && <Icon name="loader-circle" className="h-4 w-4 animate-spin" />}
            {t("confirm_delete_workflow")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
