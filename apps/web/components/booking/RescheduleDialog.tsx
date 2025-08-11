import React from "react";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calid/features/ui";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@calid/features/ui";


export function RescheduleDialog({link}: {link: string}) {
  const { t } = useLocale();  

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button color="secondary" className="flex items-center space-x-2">
          <span>Reschedule</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        className="
          bg-white rounded-lg shadow-xl
          fixed left-[50%] top-[50%] 
             w-[900px] max-w-[90vw] max-h-[80vh]
          -translate-x-1/2 -translate-y-1/2
          overflow-auto
        "
        style={{ maxHeight: 'calc(100vh - 40px)' }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900 text-center mb-1">
          { t("reschedule_booking") }
          </DialogTitle>
        </DialogHeader>

        <div className="w-full h-[400px]">
          <iframe
            src={link}
            className="w-full h-full border rounded-md"
            title="Example Iframe"
            frameBorder="0"
            allowFullScreen
          />
        </div>

        {/* <DialogFooter className="flex justify-end mt-6 space-x-3">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}
