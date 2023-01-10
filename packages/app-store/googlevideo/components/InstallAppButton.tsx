import { useState, useEffect } from "react";

import type { InstallAppButtonProps } from "@calcom/app-store/types";
import useApp from "@calcom/lib/hooks/useApp";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { DialogProps } from "@calcom/ui";
import { Button } from "@calcom/ui";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui";

import useAddAppMutation from "../../_utils/useAddAppMutation";

export default function InstallAppButton(props: InstallAppButtonProps) {
  const [showWarningDialog, setShowWarningDialog] = useState(false);

  return (
    <>
      {props.render({
        onClick() {
          setShowWarningDialog(true);
          // mutation.mutate("");
        },
        disabled: showWarningDialog,
      })}
      <WarningDialog open={showWarningDialog} onOpenChange={setShowWarningDialog} />
    </>
  );
}

function WarningDialog(props: DialogProps) {
  const { t } = useLocale();
  const googleCalendarData = useApp("google-calendar");
  const googleCalendarPresent = googleCalendarData.data?.isInstalled;

  const mutation = useAddAppMutation(googleCalendarPresent ? "google_video" : "google_calendar", {
    installGoogleVideo: !googleCalendarPresent,
  });

  return (
    <Dialog name="Account check" open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        type="creation"
        title={t("using_meet_requires_calendar")}
        description={googleCalendarPresent ? "" : t("continue_to_install_google_calendar")}>
        <DialogFooter>
          <>
            <DialogClose
              type="button"
              color="secondary"
              tabIndex={-1}
              onClick={() => {
                props.onOpenChange?.(false);
              }}>
              {t("cancel")}
            </DialogClose>

            <Button type="button" onClick={() => mutation.mutate("")}>
              {googleCalendarPresent ? t("install_google_meet") : t("install_google_calendar")}
            </Button>
          </>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
