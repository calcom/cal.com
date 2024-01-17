import { Trash } from "lucide-react";

import { Dialog, DialogTrigger, Button, ConfirmationDialogContent } from "@calcom/ui";

type LargeScreenCTAProps = {
  // isSwitchDisabled: boolean;
  // isSwitchChecked: boolean;
  // onSwitchCheckedChange: (e: any) => void;
  isButtonDisabled: boolean;
  isConfirmationDialogLoading: boolean;
  onDeleteConfirmation: () => void;
};

// TODO: add ability to set any schedule as default
// cant do it now since we don't take PATCH requests at the moment

export function LargeScreenCTA({
  // isSwitchDisabled,
  // isSwitchChecked,
  // onSwitchCheckedChange,
  isButtonDisabled,
  isConfirmationDialogLoading,
  onDeleteConfirmation,
}: LargeScreenCTAProps) {
  return (
    <>
      {/* <div className="sm:hover:bg-muted hidden items-center rounded-md px-2 sm:flex">
        <Skeleton
          as={Label}
          htmlFor="hiddenSwitch"
          className="mt-2 cursor-pointer self-center pe-2"
          loadingClassName="me-4">
          Set to Default
        </Skeleton>
        <Switch
          id="hiddenSwitch"
          disabled={isSwitchDisabled}
          checked={isSwitchChecked}
          onCheckedChange={onSwitchCheckedChange}
        />
      </div>
      <VerticalDivider className="hidden sm:inline" /> */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            StartIcon={Trash}
            variant="icon"
            color="destructive"
            aria-label="Delete"
            className="hidden sm:inline"
            disabled={isButtonDisabled}
            tooltip={isButtonDisabled ? "You are required to have at least one schedule" : "Delete"}
          />
        </DialogTrigger>
        <ConfirmationDialogContent
          isLoading={isConfirmationDialogLoading}
          variety="danger"
          title="Delete schedule"
          confirmBtnText="Delete"
          cancelBtnText="Cancel"
          loadingText="Delete"
          onConfirm={onDeleteConfirmation}>
          Deleting a schedule will remove it from all event types. This action cannot be undone.
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}
