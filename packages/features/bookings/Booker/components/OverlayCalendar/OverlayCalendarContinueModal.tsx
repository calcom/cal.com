import { CalendarSearch } from "lucide-react";
import { useRouter } from "next/navigation";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Dialog, DialogContent, DialogFooter } from "@calcom/ui";

interface IOverlayCalendarContinueModalProps {
  open?: boolean;
  onClose?: (state: boolean) => void;
}

export function OverlayCalendarContinueModal(props: IOverlayCalendarContinueModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  return (
    <>
      <Dialog open={props.open} onOpenChange={props.onClose}>
        <DialogContent
          type="creation"
          title={t("overlay_my_calendar")}
          description={t("overlay_my_calendar_toc")}>
          <div className="flex flex-col gap-2">
            <Button
              data-testid="overlay-calendar-continue-button"
              onClick={() => {
                const currentUrl = new URL(window.location.href);
                currentUrl.pathname = "/login/";
                currentUrl.searchParams.set("callbackUrl", window.location.pathname);
                currentUrl.searchParams.set("overlayCalendar", "true");

                router.push(currentUrl.toString());
              }}
              className="gap w-full items-center justify-center font-semibold"
              StartIcon={CalendarSearch}>
              {t("continue_with", { appName: APP_NAME })}
            </Button>
          </div>
          <DialogFooter>
            {/* Agh modal hacks */}
            <></>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
