import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@calid/features/ui/components/dialog";
import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

export function RescheduleDialog({ link }: { link: string }) {
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
          fixed h-[800px] max-h-[80vh]
          w-[1200px] 
             max-w-[90vw] -translate-x-1/2 -translate-y-1/2 overflow-auto 
          rounded-lg bg-white
          shadow-xl
        ">
        <DialogHeader>
          <DialogTitle className="mb-1 text-base font-semibold text-gray-900">
            {t("reschedule_booking")}
          </DialogTitle>
        </DialogHeader>

        <div className="h-[600px] w-full">
          <iframe
            src={link}
            className="h-full w-full rounded-md border"
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
