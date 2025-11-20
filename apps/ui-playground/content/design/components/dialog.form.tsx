"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useState } from "react";

import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { TextAreaField } from "@calcom/ui/components/form";

export const FormExample: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [formInput, setFormInput] = useState("");

  return (
    <RenderComponentWithSnippet>
      <div className="space-y-2">
        <Button color="secondary" onClick={() => setOpen(true)}>
          Open Form Dialog
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent title="Feedback Form" description="Please provide your feedback below">
            <div>
              <TextAreaField
                name="feedback"
                label={
                  <>
                    Your Feedback
                    <span className="text-subtle font-normal"> (Optional)</span>
                  </>
                }
                value={formInput}
                onChange={(e) => setFormInput(e.target.value)}
              />
            </div>
            <DialogFooter>
              <DialogClose />
              <Button
                onClick={() => {
                  setOpen(false);
                  setFormInput("");
                }}>
                Submit Feedback
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="mt-6">
          <h4 className="text-emphasis text-sm font-medium">Current Form Input:</h4>
          <pre className="text-default bg-subtle mt-2 rounded-md p-4 text-sm">
            {formInput || "No input yet"}
          </pre>
        </div>
      </div>
    </RenderComponentWithSnippet>
  );
};
