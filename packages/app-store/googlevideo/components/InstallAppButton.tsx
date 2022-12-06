import { useState } from "react";

import type { InstallAppButtonProps } from "@calcom/app-store/types";
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
  const mutation = useAddAppMutation("google_video");
  return (
    <Dialog name="Account check" open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent type="creation" title="Using Google Meet requires a connected Google Calendar">
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
              Continue
            </Button>
          </>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
