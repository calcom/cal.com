import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
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
      if (segmentId === id) {
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
      <DialogContent>
        <DialogHeader title={t("delete_segment")} />
        <div className="mb-6">{t("delete_segment_confirmation")}</div>
        <DialogFooter>
          <Button color="secondary" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button color="destructive" onClick={handleDelete} loading={isPending}>
            {t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
