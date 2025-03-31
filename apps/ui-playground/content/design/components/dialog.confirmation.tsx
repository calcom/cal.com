"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useState } from "react";

import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";

export const ConfirmationExample: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <RenderComponentWithSnippet>
      <div className="space-y-2">
        <Button color="destructive" onClick={() => setOpen(true)}>
          Delete Item
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            title="Confirm Deletion"
            description="Are you sure you want to delete this item? This action cannot be undone.">
            <DialogFooter>
              <DialogClose />
              <Button
                color="destructive"
                onClick={() => {
                  setOpen(false);
                }}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RenderComponentWithSnippet>
  );
};
