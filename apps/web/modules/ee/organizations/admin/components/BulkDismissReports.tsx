import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { ConfirmationDialogContent, DialogTrigger } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { DataTableSelectionBar } from "~/data-table/components";

type BookingReport = RouterOutputs["viewer"]["admin"]["watchlist"]["listReports"]["rows"][number];

interface Props {
  reports: BookingReport[];
  onRemove: () => void;
}

export function BulkDismissReports({ reports, onRemove }: Props) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const bulkDismissMutation = trpc.viewer.admin.watchlist.bulkDismiss.useMutation({
    onSuccess: async (data) => {
      await utils.viewer.admin.watchlist.listReports.invalidate();
      await utils.viewer.admin.watchlist.pendingReportsCount.invalidate();
      showToast(
        data.failed === 0
          ? t("reports_dismissed_successfully", { count: data.success })
          : t("reports_dismissed_with_errors", {
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
        <DataTableSelectionBar.Button icon="x" color="secondary">
          {t("dismiss")}
        </DataTableSelectionBar.Button>
      </DialogTrigger>
      <ConfirmationDialogContent
        variety="warning"
        title={t("dismiss_reports_title")}
        confirmBtnText={t("dismiss")}
        isPending={bulkDismissMutation.isPending}
        onConfirm={() => {
          bulkDismissMutation.mutate({
            emails: reports.map((group) => group.bookerEmail),
          });
        }}>
        <p className="mt-5">{t("dismiss_reports_confirm", { count: reports.length })}</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
