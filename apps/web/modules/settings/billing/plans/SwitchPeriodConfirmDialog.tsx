import { useLocale } from "@calcom/i18n/useLocale";
import { Button } from "@coss/ui/components/button";
import { Dialog, DialogClose, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@coss/ui/components/dialog";

interface SwitchPeriodConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPeriod: "MONTHLY" | "ANNUALLY";
  effectiveDate?: string;
  isPending: boolean;
  isTrialing?: boolean;
  onConfirm: () => void;
}

export function SwitchPeriodConfirmDialog({
  open,
  onOpenChange,
  targetPeriod,
  effectiveDate,
  isPending,
  isTrialing,
  onConfirm,
}: SwitchPeriodConfirmDialogProps) {
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>{t("switch_billing_period_confirm_title")}</DialogTitle>
        </DialogHeader>
        <DialogPanel>
          <p className="text-sm text-subtle">
            {targetPeriod === "ANNUALLY"
              ? t("switch_to_annual_confirm_description")
              : t("switch_to_monthly_confirm_description", { date: effectiveDate ?? "" })}
          </p>
          {isTrialing && (
            <p className="mt-2 text-sm font-medium text-attention">
              {t("switch_billing_period_trial_warning")}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" />}>{t("cancel")}</DialogClose>
            <Button onClick={onConfirm} disabled={isPending}>
              {isPending ? t("loading") : t("confirm")}
            </Button>
          </div>
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
