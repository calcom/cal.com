import { CalendarSearch } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button, Dialog, DialogContent, DialogFooter } from "@calcom/ui";

interface IOverlayCalendarContinueModalProps {
  open?: boolean;
  onClose?: (state: boolean) => void;
}

export function OverlayCalendarContinueModal(props: IOverlayCalendarContinueModalProps) {
  const router = useRouter();
  return (
    <>
      <Dialog open={props.open} onOpenChange={props.onClose}>
        <DialogContent
          type="creation"
          title="Overlay my calendar"
          description="By connecting to your calendar, you accept our privacy policy and terms of use. You may revoke
            access at any time.">
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                const currentUrl = new URL(window.location.href);
                currentUrl.pathname = "/login/";
                currentUrl.searchParams.set("callbackUrl", window.location.pathname);
                currentUrl.searchParams.set("overlayCalendar", "true");

                router.push(currentUrl.toString());
              }}
              className="gap w-full items-center justify-center font-semibold"
              StartIcon={CalendarSearch}>
              Continue with Cal.com
            </Button>
            <Button
              className="gap w-full items-center justify-center"
              StartIcon={CalendarSearch}
              color="secondary">
              Continue with Google
            </Button>
            <Button
              className="gap w-full items-center justify-center"
              StartIcon={CalendarSearch}
              color="secondary">
              Continue with Microsoft
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
