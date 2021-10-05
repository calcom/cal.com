import React, { forwardRef, ReactNode, useImperativeHandle, useState } from "react";

import { SVGComponent } from "@lib/types/SVGComponent";

import { Dialog, DialogContent } from "@components/Dialog";

interface Props {
  children: ReactNode;
  title: string;
  subtitle: string;
  icon: SVGComponent;
}

export type ImperativeDialogRef = {
  open: () => void;
  close: () => void;
};

/**
 * A custom Dialog with it's own state that can be handled by it's parents using
 * references. This allows to avoid unnecessary renders on the parent.
 */
const ImperativeDialog = forwardRef<ImperativeDialogRef, Props>((props, ref) => {
  const { children, title, subtitle, icon: Icon } = props;
  const [open, setOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));

  return (
    <Dialog open={open}>
      <DialogContent asChild>
        <div className="inline-block px-4 pt-5 pb-4 text-left align-bottom transition-all transform bg-white rounded-sm shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="mb-4 sm:flex sm:items-start">
            <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto rounded-full bg-secondary-100 sm:mx-0 sm:h-10 sm:w-10">
              <Icon className="w-6 h-6 text-primary-600" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                {title}
              </h3>
              <div>
                <p className="text-sm text-gray-400">{subtitle}</p>
              </div>
            </div>
          </div>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
});

ImperativeDialog.displayName = "ImperativeDialog";

export default ImperativeDialog;
