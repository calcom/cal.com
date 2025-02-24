import type { DialogProps } from "@calcom/ui";
import { Button } from "@calcom/ui";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui";

export function AccountDialog(
  props: DialogProps & {
    handleSubmit: () => void;
  }
) {
  return (
    <Dialog name="Account check" open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        type="creation"
        title="Connecting with MS Teams requires a work/school Microsoft account."
        description="If you continue with a personal account you will receive an error">
        <DialogFooter showDivider className="mt-6">
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

            <Button type="button" onClick={props.handleSubmit}>
              Continue
            </Button>
          </>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AccountDialog;
