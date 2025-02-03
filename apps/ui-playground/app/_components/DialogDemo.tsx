"use client";

import { useState } from "react";

import { Button, Dialog, DialogClose, DialogContent, DialogFooter, TextAreaField } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

export default function DialogDemo() {
  const [basicDialogOpen, setBasicDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formInput, setFormInput] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [largeContentDialogOpen, setLargeContentDialogOpen] = useState(false);

  return (
    <DemoSection title="Dialog">
      <DemoSubSection id="dialog-basic" title="Basic Dialog">
        <div className="space-y-2">
          <Button onClick={() => setBasicDialogOpen(true)}>Open Basic Dialog</Button>
          <Dialog open={basicDialogOpen} onOpenChange={setBasicDialogOpen}>
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
      </DemoSubSection>

      <DemoSubSection id="dialog-large-content" title="Large Content Dialog">
        <div className="space-y-2">
          <Button color="secondary" onClick={() => setLargeContentDialogOpen(true)}>
            Open Large Content Dialog
          </Button>
          <Dialog open={largeContentDialogOpen} onOpenChange={setLargeContentDialogOpen}>
            <DialogContent
              title="Terms and Conditions"
              description="Please review our terms and conditions carefully"
              enableOverflow>
              <div className="space-y-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-4">
                    <h3 className="text-emphasis font-semibold">Section {i + 1}</h3>
                    <p className="text-default text-sm">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris. Vivamus
                      hendrerit arcu sed erat molestie vehicula. Sed auctor neque eu tellus rhoncus ut
                      eleifend nibh porttitor. Ut in nulla enim. Phasellus molestie magna non est bibendum non
                      venenatis nisl tempor.
                    </p>
                    <p className="text-default text-sm">
                      Suspendisse in orci enim. Integer vel sapien at risus ultrices ornare nec sit amet nibh.
                      Duis blandit lectus ac odio rhoncus non congue diam bibendum. Aliquam erat volutpat.
                    </p>
                    {i === 2 && (
                      <div className="border-subtle rounded-lg border p-4 shadow-sm">
                        <h4 className="text-emphasis mb-2 font-medium">Important Notice</h4>
                        <p className="text-default text-sm">
                          This is a highlighted section within the content to demonstrate how different UI
                          elements appear within a scrollable dialog.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <DialogClose>Decline</DialogClose>
                <Button>Accept Terms</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DemoSubSection>

      <DemoSubSection id="dialog-form" title="Form Dialog">
        <div className="space-y-2">
          <Button color="secondary" onClick={() => setFormDialogOpen(true)}>
            Open Form Dialog
          </Button>
          <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
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
                    setFormDialogOpen(false);
                    setFormInput("");
                  }}>
                  Submit Feedback
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DemoSubSection>

      <DemoSubSection id="dialog-confirm" title="Confirmation Dialog">
        <div className="space-y-2">
          <Button color="destructive" onClick={() => setConfirmDialogOpen(true)}>
            Delete Item
          </Button>
          <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
            <DialogContent
              title="Confirm Deletion"
              description="Are you sure you want to delete this item? This action cannot be undone.">
              <DialogFooter>
                <DialogClose />
                <Button
                  color="destructive"
                  onClick={() => {
                    setConfirmDialogOpen(false);
                  }}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DemoSubSection>

      <div className="mt-6">
        <h4 className="text-emphasis text-sm font-medium">Current Form Input:</h4>
        <pre className="text-default bg-subtle mt-2 rounded-md p-4 text-sm">
          {formInput || "No input yet"}
        </pre>
      </div>
    </DemoSection>
  );
}
