import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
import type { PartialReference } from "@calcom/types/EventManager";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui";

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

interface IViewRecordingsDialog {
  booking?: BookingItem;
  isOpenDialog: boolean;
  setIsOpenDialog: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ViewRecordingsDialog = (props: IViewRecordingsDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, booking } = props;
  const roomName =
    booking?.references?.find((reference: PartialReference) => reference.type === "daily_video")?.meetingId ??
    undefined;
  console.log("roomName", roomName);

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent>
        <DialogHeader title={t("recordings_title")} />

        {roomName ? (
          <p className="mt-6 mb-2 text-sm font-bold text-black">Download</p>
        ) : (
          <h1>No Recordings Found </h1>
        )}

        <DialogFooter>
          <DialogClose />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewRecordingsDialog;
