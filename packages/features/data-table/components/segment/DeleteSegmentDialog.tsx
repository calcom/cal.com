import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@calid/features/ui/components/dialog";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
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
        <DialogHeader>
          <DialogTitle>{t("delete_segment")}</DialogTitle>
          <DialogDescription>
            {t("delete_segment_confirmation", { segmentName: segment.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" color="minimal" onClick={onClose} disabled={isPending}>
            {t("cancel")}
          </Button>
          <Button type="button" color="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? t("deleting") : t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
