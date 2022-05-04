import { XIcon } from "@heroicons/react/solid";
import { useState } from "react";

import { Dialog, DialogContent } from "@calcom/ui/Dialog";

const FullScreenDialog = (props: React.PropsWithChildren<{ open: boolean }>) => {
  const [open, setOpen] = useState(props.open);
  return (
    <>
      <Dialog open={open} onOpenChange={() => setOpen(false)}>
        <DialogContent className="h-full w-full min-w-[30rem] bg-black p-0 sm:max-h-[50rem] sm:w-full sm:max-w-[60rem] sm:align-middle">
          <div
            className="flex h-8 w-8 justify-center text-white hover:bg-gray-200 hover:text-black"
            onClick={() => setOpen(false)}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: "inherit",
            }}>
            <XIcon className="w-4" />
          </div>
          {props.children}
        </DialogContent>
      </Dialog>
    </>
  );
};

export { FullScreenDialog };
