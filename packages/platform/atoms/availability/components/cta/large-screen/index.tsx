import { Trash } from "lucide-react";

import { Dialog, DialogTrigger, Button, ConfirmationDialogContent } from "@calcom/ui";

type LargeScreenCTAProps = {
  // isSwitchDisabled: boolean;
  // isSwitchChecked: boolean;
  // onSwitchCheckedChange: (e: any) => void;
  isButtonDisabled: boolean;
  isConfirmationDialogLoading: boolean;
  onDeleteConfirmation: () => void;
  translationLabels: {
    setToDefaultLabel?: string;
    deleteAriaLabel?: string;
    deleteTooltip?: string;
    confirmationDialogTitle?: string;
    confirmationDialogButtonText?: string;
    confirmationDialogDescription?: string;
  };
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
  translationLabels,
}: LargeScreenCTAProps) {
  return (
    <div>
      {/* <div className="sm:hover:bg-muted hidden items-center rounded-md px-2 sm:flex">
        <Skeleton
          as={Label}
          htmlFor="hiddenSwitch"
          className="mt-2 cursor-pointer self-center pe-2"
          loadingClassName="me-4">
         {translationLabels.setToDefaultLabel}
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
            aria-label={translationLabels.deleteAriaLabel}
            className="hidden sm:inline"
            disabled={isButtonDisabled}
            tooltip={
              isButtonDisabled ? `${translationLabels.deleteTooltip}` : `${translationLabels.deleteAriaLabel}`
            }
          />
        </DialogTrigger>
        <ConfirmationDialogContent
          isPending={isConfirmationDialogLoading}
          variety="danger"
          title={translationLabels.confirmationDialogTitle || "Delete schedule"}
          confirmBtnText={translationLabels.confirmationDialogButtonText}
          loadingText={translationLabels.confirmationDialogButtonText}
          onConfirm={onDeleteConfirmation}>
          {translationLabels.confirmationDialogDescription}
        </ConfirmationDialogContent>
      </Dialog>
    </div>
  );
}
