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
          fixed 
             w-[1200px] max-w-[90vw] max-h-[80vh] h-[800px] 
          -translate-x-1/2 -translate-y-1/2
          overflow-auto
        "
      >
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-900 mb-1">
          { t("reschedule_booking") }
          </DialogTitle>
        </DialogHeader>

        <div className="w-full h-[600px]">
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
