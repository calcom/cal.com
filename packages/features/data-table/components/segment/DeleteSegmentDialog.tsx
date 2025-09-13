import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Dialog, ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";

import { useDataTable } from "../../hooks";
import type { FilterSegmentOutput } from "../../lib/types";

export function DeleteSegmentDialog({
  segment,
  onClose,
}: {
  segment: FilterSegmentOutput;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { segmentId, setSegmentId } = useDataTable();

  const { mutate: deleteSegment, isPending } = trpc.viewer.filterSegments.delete.useMutation({
    onSuccess: ({ id }) => {
      utils.viewer.filterSegments.list.invalidate();
      showToast(t("filter_segment_deleted"), "success");
      if (segmentId && segmentId.type === "user" && segmentId.id === id) {
        setSegmentId(null);
      }
      onClose();
    },
    onError: () => {
      showToast(t("error_deleting_filter_segment"), "error");
    },
  });

  const handleDelete = () => {
    if (!segment) return;
    deleteSegment({ id: segment.id });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}>
      <ConfirmationDialogContent
        variety="danger"
        title={t("delete_segment")}
        confirmBtnText={t("delete")}
        cancelBtnText={t("cancel")}
        isPending={isPending}
        onConfirm={handleDelete}>
        <p className="mt-5">{t("delete_segment_confirmation")}</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
