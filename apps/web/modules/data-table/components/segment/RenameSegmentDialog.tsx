import type { FilterSegmentOutput } from "@calcom/features/data-table/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Form, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useForm } from "react-hook-form";

type FormValues = {
  name: string;
};

export function RenameSegmentDialog({
  segment,
  onClose,
}: {
  segment: FilterSegmentOutput;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const form = useForm<FormValues>({
    defaultValues: {
      name: segment.name,
    },
  });
  const utils = trpc.useUtils();

  const { mutate: updateSegment, isPending } = trpc.viewer.filterSegments.update.useMutation({
    onSuccess: () => {
      utils.viewer.filterSegments.list.invalidate();
      showToast(t("filter_segment_updated"), "success");
      onClose();
    },
    onError: () => {
      showToast(t("error_updating_filter_segment"), "error");
    },
  });

  const handleSubmit = (data: FormValues) => {
    if (!segment) {
      return;
    }
    if (segment.scope === "TEAM") {
      updateSegment({
        ...segment,
        scope: "TEAM",
        teamId: segment.teamId ?? 0,
        name: data.name,
      });
      return;
    }
    updateSegment({
      ...segment,
      scope: "USER",
      name: data.name,
    });
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
        <DialogHeader title={t("rename_segment")} />
        <Form form={form} handleSubmit={handleSubmit}>
          <div className="stack-y-4">
            <TextField
              required
              data-testid="rename-segment-name"
              type="text"
              label={t("name")}
              {...form.register("name")}
            />
            <DialogFooter>
              <Button type="submit" loading={isPending}>
                {t("save")}
              </Button>
            </DialogFooter>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
