import Button from "@calcom/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogProps,
} from "@calcom/ui/Dialog";

import useAddAppMutation from "../../_utils/useAddAppMutation";

export function AccountDialog(props: DialogProps) {
  const mutation = useAddAppMutation("office365_video");
  return (
    <Dialog name="Account check" {...props}>
      <DialogContent>
        <DialogHeader
          title="Connecting with MS Teams requires a work/school Microsoft account."
          subtitle="If you continue with a personal account you will receive an error"
        />

        <DialogFooter>
          <DialogClose
            onClick={() => {
              props.onOpenChange?.(false);
            }}
            asChild>
            <Button type="button" color="secondary" tabIndex={-1}>
              Cancel
            </Button>
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
