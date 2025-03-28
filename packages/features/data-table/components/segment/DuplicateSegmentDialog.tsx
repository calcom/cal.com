import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Form, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import { useDataTable } from "../../hooks";
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
  const { setSegmentId } = useDataTable();
  const utils = trpc.useUtils();
  const session = useSession();
  const isAdminOrOwner = checkAdminOrOwner(session.data?.user?.org?.role);

  const { mutate: createSegment, isPending } = trpc.viewer.filterSegments.create.useMutation({
    onSuccess: ({ id }) => {
      utils.viewer.filterSegments.list.invalidate();
      showToast(t("filter_segment_duplicated"), "success");
      setSegmentId(id);
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
    const { id: _id, name: _name, team: _team, teamId, ...rest } = segment;

    if (segment.scope === "TEAM" && isAdminOrOwner) {
      createSegment({
        ...rest,
        teamId: teamId ?? 0,
        scope: "TEAM",
        name: data.name,
      });
    } else {
      createSegment({
        ...rest,
        scope: "USER",
        name: data.name,
      });
    }
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
