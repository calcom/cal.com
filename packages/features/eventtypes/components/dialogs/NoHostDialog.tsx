import { Dialog } from "@calcom/features/components/controlled-dialog";
import type { DialogProps as ControlledDialogProps } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogHeader, DialogFooter } from "@calcom/ui/components/dialog";

export function NoHostDialog({
  eventTypeId,
  open,
  onOpenChange,
}: { eventTypeId: number } & Pick<ControlledDialogProps, "open" | "onOpenChange">) {
  const { t } = useLocale();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent enableOverflow>
        <div className="w-full pt-1">
          <DialogHeader
            title={t("no_host_assigned")}
            subtitle={t("no_host_assigned_description")}
            className="mb-0"
          />
        </div>
        <DialogFooter showDivider className="mt-8">
          <Button color="secondary" onClick={() => onOpenChange?.(false)}>
            {t("ill_do_it_later")}
          </Button>
          <Button
            data-testid="send_request"
            href={`/event-types/${eventTypeId}?tabName=team`}
            onClick={() => onOpenChange?.(false)}>
            {t("add_host")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
