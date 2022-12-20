import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui";
import { Badge, Button, showToast } from "@calcom/ui";

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

interface IViewRecordingsDialog {
  booking?: BookingItem;
  isOpenDialog: boolean;
  setIsOpenDialog: React.Dispatch<React.SetStateAction<boolean>>;
}

type RecordingObjType = {
  id: string;
  room_name: string;
  start_ts: number;
  status: string;
  max_participants: number;
  duration: number;
  share_token: string;
};

function convertStoMs(seconds: number) {
  // Bitwise Double Not is faster than Math.floor
  const minutes = ~~(seconds / 60);
  const extraSeconds = seconds % 60;
  return `${minutes} minutes ${extraSeconds} seconds`;
}

export const ViewRecordingsDialog = (props: IViewRecordingsDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, booking } = props;
  const [downloadingRecordingId, setRecordingId] = useState("");
  // const roomName =
  //   booking?.references?.find((reference: PartialReference) => reference.type === "daily_video")?.meetingId ??
  //   undefined;

  // NOTE: this is just for testing
  const roomName = "L6POqJ6OQtNnBjww8ac7";

  const { data, isLoading } = trpc.viewer.getCalVideoRecordings.useQuery(
    { roomName: roomName ?? "" },
    { enabled: !!roomName && isOpenDialog }
  );

  const handleDownloadClick = async (recordingId: string, api_key: string | undefined) => {
    try {
      if (!api_key) return;
      setRecordingId(recordingId);
      const res = await fetch(`https://api.daily.co/v1/recordings/${recordingId}/access-link`, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + api_key,
          "Content-Type": "application/json",
        },
      }).then((res) => res.json());

      window.open(res.download_link);
    } catch (err) {
      showToast(t("something_went_wrong"), "error");
    }
    setRecordingId("");
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent>
        <DialogHeader title={t("recordings_title")} />

        {data?.recordings?.total_count ? (
          <>
            {data.recordings.data?.map((recording: RecordingObjType, index: number) => {
              return (
                <div className="flex w-full items-center justify-between" key={recording.id}>
                  <div className="flex items-center gap-2">
                    <h1>Recording {index + 1}</h1>
                    <Badge variant="gray">{convertStoMs(recording.duration)}</Badge>
                    <Badge variant="green">{recording.status.toUpperCase()}</Badge>
                  </div>
                  <Button
                    className="ml-4 lg:ml-0"
                    loading={downloadingRecordingId === recording.id}
                    onClick={() => handleDownloadClick(recording.id, data.api_key)}>
                    {t("download")}
                  </Button>
                </div>
              );
            })}
          </>
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
