import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { ConfirmationDialogContent, DialogTrigger } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { DataTableSelectionBar } from "~/data-table/components";

type BlocklistEntry = RouterOutputs["viewer"]["admin"]["watchlist"]["list"]["rows"][number];

interface Props {
  entries: BlocklistEntry[];
  onRemove: () => void;
}

export function BulkDeleteBlocklistEntries({ entries, onRemove }: Props) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const bulkDeleteMutation = trpc.viewer.admin.watchlist.bulkDelete.useMutation({
    onSuccess: async (data) => {
      await utils.viewer.admin.watchlist.list.invalidate();
      showToast(
        data.failed === 0
          ? t("entries_deleted_successfully", { count: data.success })
          : t("entries_deleted_with_errors", {
              success: data.success,
              failed: data.failed,
            }),
        data.failed === 0 ? "success" : "warning"
      );
      onRemove();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <DataTableSelectionBar.Button icon="trash" color="destructive">
          {t("remove_from_blocklist")}
        </DataTableSelectionBar.Button>
      </DialogTrigger>
      <ConfirmationDialogContent
        variety="danger"
        title={t("remove_entries_from_system_blocklist")}
        confirmBtnText={t("remove")}
        isPending={bulkDeleteMutation.isPending}
        onConfirm={() => {
          bulkDeleteMutation.mutate({
            ids: entries.map((entry) => entry.id),
          });
        }}>
        <p className="mt-5">{t("remove_entries_confirm", { count: entries.length })}</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
