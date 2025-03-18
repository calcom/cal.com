import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import {
  showToast,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  Form,
  TextField,
} from "@calcom/ui";

import type { FilterSegmentOutput } from "../../lib/types";

type FormValues = {
  name: string;
};

export function DuplicateSegmentDialog({
  segment,
  onClose,
}: {
  segment: FilterSegmentOutput;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
    },
  });
  const utils = trpc.useUtils();

  const { mutate: createSegment, isPending } = trpc.viewer.filterSegments.create.useMutation({
    onSuccess: () => {
      utils.viewer.filterSegments.list.invalidate();
      showToast(t("filter_segment_duplicated"), "success");
      onClose();
    },
    onError: () => {
      showToast(t("error_duplicating_filter_segment"), "error");
    },
  });

  const handleSubmit = (data: FormValues) => {
    if (!segment) {
      return;
    }
    const { id: _id, name: _name, ...rest } = segment;
    createSegment({
      ...rest,
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
        <DialogHeader title={t("duplicate_segment")} />
        <Form form={form} handleSubmit={handleSubmit}>
          <div className="space-y-4">
            <TextField required type="text" label={t("name")} {...form.register("name")} />
            <DialogFooter>
              <Button color="minimal" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button type="submit" loading={isPending}>
                {t("duplicate")}
              </Button>
            </DialogFooter>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
