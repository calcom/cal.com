import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@calid/features/ui/components/dialog";

import { useLocale } from "@calcom/lib/hooks/useLocale";

interface IOverlayCalendarContinueModalProps {
  open?: boolean;
  onClose?: (state: boolean) => void;
  onContinue: () => void;
}

export function OverlayCalendarContinueModal(props: IOverlayCalendarContinueModalProps) {
  const { t } = useLocale();
  return (
    <>
      <Dialog open={props.open} onOpenChange={props.onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("overlay_my_calendar")}</DialogTitle>
            <DialogDescription>{t("overlay_my_calendar_toc")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              data-testid="overlay-calendar-continue-button"
              onClick={() => {
                props.onContinue();
              }}
              className="gap w-full items-center justify-center font-semibold"
              EndIcon="arrow-right">
              {t("continue")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
