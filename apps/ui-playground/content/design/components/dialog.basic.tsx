"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useState } from "react";

import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";

export const BasicExample: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <RenderComponentWithSnippet>
      <div className="space-y-2">
        <Button onClick={() => setOpen(true)}>Open Basic Dialog</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            title="Basic Dialog"
            description="This is a basic dialog with a title and description.">
            <p className="text-default text-sm">
              Dialogs are used to display content that requires user attention or interaction. They appear
              above the page content and must be closed before interacting with the page again.
            </p>
            <DialogFooter>
              <DialogClose />
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RenderComponentWithSnippet>
  );
};
