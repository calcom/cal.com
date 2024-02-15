import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Trash } from "lucide-react";
import { useState } from "react";

import { Button } from "@calcom/ui";
import { VerticalDivider, Label, Switch, Skeleton } from "@calcom/ui";

type LargeScreenCTAProps = {
  isDeleteButtonDisabled: boolean;
  isSwitchDisabled: boolean;
  onDeleteConfirmation: () => void;
};

export function LargeScreenCTA({
  isDeleteButtonDisabled,
  isSwitchDisabled,
  onDeleteConfirmation,
}: LargeScreenCTAProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="flex items-center justify-end">
      <div className="sm:hover:bg-muted hidden items-center rounded-md px-2 sm:flex">
        <Skeleton
          waitForTranslation={false}
          as={Label}
          htmlFor="hiddenSwitch"
          className="mt-2 cursor-pointer self-center pe-2"
          loadingClassName="me-4">
          Set to Default
        </Skeleton>
        <Switch id="hiddenSwitch" disabled={isSwitchDisabled} />
      </div>
      <VerticalDivider className="hidden sm:inline" />
      <Dialog
        open={isDialogOpen}
        onOpenChange={() => {
          setIsDialogOpen((prevValue) => !prevValue);
        }}>
        <DialogTrigger asChild>
          <div>
            <TooltipProvider>
              <Button
                StartIcon={Trash}
                variant="icon"
                color="destructive"
                tooltip={isDeleteButtonDisabled ? "You are required to have at least one schedule" : "Delete"}
                aria-label="Delete"
                className="hidden sm:inline"
                disabled={isDeleteButtonDisabled}
              />
            </TooltipProvider>
          </div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete schedule</DialogTitle>
            <DialogDescription>
              Deleting a schedule will remove it from all event types. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              className="border-none"
              color="secondary"
              type="button"
              onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="ml-2"
              onClick={() => {
                setIsDialogOpen(false);
                onDeleteConfirmation();
              }}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
