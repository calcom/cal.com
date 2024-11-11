import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";
import { getAppOnboardingUrl } from "@calcom/lib/apps/getAppOnboardingUrl";
import { WEBAPP_URL } from "@calcom/lib/constants";
import type { DialogProps } from "@calcom/ui";
import { Button } from "@calcom/ui";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui";

import useAddAppMutation from "../../_utils/useAddAppMutation";

export function AccountDialog(props: DialogProps) {
  const mutation = useAddAppMutation(null);
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

            <Button
              type="button"
              onClick={() =>
                mutation.mutate({
                  type: "office365_video",
                  variant: "conferencing",
                  slug: "msteams",
                  returnTo:
                    WEBAPP_URL +
                    getAppOnboardingUrl({
                      slug: "msteams",
                      step: AppOnboardingSteps.EVENT_TYPES_STEP,
                    }),
                })
              }>
              Continue
            </Button>
          </>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AccountDialog;
