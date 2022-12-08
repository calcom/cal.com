import { useState } from "react";

import type { InstallAppButtonProps } from "@calcom/app-store/types";
import { trpc } from "@calcom/trpc/react";
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
  const [googleCalendarPresent, setGoogleCalendarPresent] = useState<undefined | boolean>(undefined);

  const mutation = useAddAppMutation(googleCalendarPresent ? "google_video" : "google_calendar", {
    installGoogleVideo: !googleCalendarPresent,
  });
  const { data, isLoading } = trpc.viewer.integrations.useQuery(
    {
      variant: "calendar",
      onlyInstalled: true,
    },
    {
      onSuccess: (data) => {
        setGoogleCalendarPresent(data.items?.some((calendar) => calendar.type === "google_calendar"));
      },
    }
  );

  return (
    <Dialog name="Account check" open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        type="creation"
        title="Using Google Meet requires a connected Google Calendar"
        description={googleCalendarPresent ? "" : "Continue to install Google Calendar"}>
        <DialogFooter>
          <>
            <DialogClose
              type="button"
              color="secondary"
              tabIndex={-1}
              onClick={() => {
                props.onOpenChange?.(false);
              }}>
              Cancel
            </DialogClose>

            <Button type="button" onClick={() => mutation.mutate("")}>
              {googleCalendarPresent ? "Install Google Meet" : "Install Google Calendar"}
            </Button>
          </>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
