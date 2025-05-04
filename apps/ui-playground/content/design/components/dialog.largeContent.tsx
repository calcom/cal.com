"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useState } from "react";

import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";

export const LargeContentExample: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <RenderComponentWithSnippet>
      <div className="space-y-2">
        <Button color="secondary" onClick={() => setOpen(true)}>
          Open Large Content Dialog
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
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
                    hendrerit arcu sed erat molestie vehicula. Sed auctor neque eu tellus rhoncus ut eleifend
                    nibh porttitor. Ut in nulla enim. Phasellus molestie magna non est bibendum non venenatis
                    nisl tempor.
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
    </RenderComponentWithSnippet>
  );
};
