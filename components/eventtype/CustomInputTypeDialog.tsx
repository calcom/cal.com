import { PlusIcon } from "@heroicons/react/solid";
import React, { ComponentProps, forwardRef, useImperativeHandle, useState } from "react";

import { Dialog, DialogContent } from "@components/Dialog";

import CustomInputTypeForm from "./CustomInputTypeForm";

interface Props {
  onSubmit: ComponentProps<typeof CustomInputTypeForm>["onSubmit"];
  selectedCustomInput: ComponentProps<typeof CustomInputTypeForm>["selectedCustomInput"];
}

export type CustomInputTypeDialogRef = {
  open: () => void;
  close: () => void;
};

const CustomInputTypeDialog = forwardRef<CustomInputTypeDialogRef, Props>((props, ref) => {
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
              <PlusIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                Add new custom input field
              </h3>
              <div>
                <p className="text-sm text-gray-400">This input will be shown when booking this event</p>
              </div>
            </div>
          </div>
          <CustomInputTypeForm
            selectedCustomInput={props.selectedCustomInput}
            onSubmit={(values) => {
              setOpen(false);
              props.onSubmit(values);
            }}
            onCancel={() => {
              setOpen(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
});

CustomInputTypeDialog.displayName = "CustomInputTypeDialog";

export default CustomInputTypeDialog;
