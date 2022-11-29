import type { DialogProps } from "@calcom/ui";
import { Button, Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui";

import useAddAppMutation from "../../_utils/useAddAppMutation";

export function AccountDialog(props: DialogProps) {
  const mutation = useAddAppMutation("office365_video");
  return (
    <Dialog name="Account check" {...props}>
      <DialogContent type="confirmation">
        <DialogHeader
          title="Connecting with MS Teams requires a work/school Microsoft account."
          subtitle="If you continue with a personal account you will receive an error"
        />

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AccountDialog;
