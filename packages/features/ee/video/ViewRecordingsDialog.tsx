import { useSession } from "next-auth/react";
import { useState } from "react";

import dayjs from "@calcom/dayjs";
import LicenseRequired from "@calcom/features/ee/common/components/v2/LicenseRequired";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui";
import { Loader, Button, showToast, Icon } from "@calcom/ui";

import TeamsUpgradeRecordingBanner from "./components/TeamUgradeRecordingBanner";

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

interface IViewRecordingsDialog {
  booking?: BookingItem;
  isOpenDialog: boolean;
  setIsOpenDialog: React.Dispatch<React.SetStateAction<boolean>>;
  timeFormat: number | null;
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
  return `${minutes}min  ${extraSeconds}sec`;
}

interface GetTimeSpanProps {
  startTime: string | undefined;
  endTime: string | undefined;
  locale: string;
  hour12: boolean;
}

const getTimeSpan = ({ startTime, endTime, locale, hour12 }: GetTimeSpanProps) => {
  if (!startTime || !endTime) return "";
  return (
    new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "numeric", hour12 }).format(
      new Date(startTime)
    ) +
    " - " +
    new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "numeric", hour12 }).format(new Date(endTime))
  );
};

export const ViewRecordingsDialog = (props: IViewRecordingsDialog) => {
  const { t, i18n } = useLocale();
  const { isOpenDialog, setIsOpenDialog, booking, timeFormat } = props;
  const [downloadingRecordingId, setRecordingId] = useState<string>("");
  const session = useSession();
  const belongsToActiveTeam = session?.data?.user?.belongsToActiveTeam ?? false;
  const [showUpgradeBanner, setShowUpgradeBanner] = useState<boolean>(false);
  // const roomName =
  //   booking?.references?.find((reference: PartialReference) => reference.type === "daily_video")?.meetingId ??
  //   undefined;

  // NOTE: this is just for testing
  const roomName = "L6POqJ6OQtNnBjww8ac7";

  const { data, isLoading } = trpc.viewer.getCalVideoRecordings.useQuery(
    { roomName: roomName ?? "" },
    { enabled: !!roomName && isOpenDialog }
  );
  const handleDownloadClick = async (recordingId: string) => {
    try {
      setRecordingId(recordingId);
      const res = await fetch(`${WEBSITE_URL}/api/download-cal-video-recording?recordingId=${recordingId}`, {
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((res) => res.json())
        .catch((err: any) => {
          throw new Error(err);
        });
      console.log(res.download_link);
      if (res?.download_link) {
        window.location.href = res.download_link;
      }
    } catch (err) {
      console.log(err);
      showToast(t("something_went_wrong"), "error");
    }
    setRecordingId("");
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent>
        <DialogHeader
          title={t("recordings_title")}
          subtitle={`${booking?.title} - ${dayjs(booking?.startTime).format("ddd")} ${dayjs(
            booking?.startTime
          ).format("D")}, ${dayjs(booking?.startTime).format("MMM")} ${getTimeSpan({
            startTime: booking?.startTime,
            endTime: booking?.endTime,
            locale: i18n.language,
            hour12: timeFormat === 12,
          })} `}
        />
        <LicenseRequired>
          {!showUpgradeBanner ? (
            <>
              {isLoading && <Loader />}
              {data?.recordings?.total_count && (
                <div className="flex flex-col gap-3">
                  {data.recordings.data?.map((recording: RecordingObjType, index: number) => {
                    return (
                      <div
                        className="flex w-full items-center justify-between rounded-md border py-2 px-4"
                        key={recording.id}>
                        <div className="flex flex-col">
                          <h1 className="text-sm font-semibold">
                            {t("recording")} {index + 1}
                          </h1>
                          <p className="text-sm font-normal text-gray-500">
                            {convertStoMs(recording.duration)}
                          </p>
                        </div>
                        {belongsToActiveTeam ? (
                          <Button
                            StartIcon={Icon.FiDownload}
                            className="ml-4 lg:ml-0"
                            loading={downloadingRecordingId === recording.id}
                            onClick={() => handleDownloadClick(recording.id)}>
                            {t("download")}
                          </Button>
                        ) : (
                          <Button
                            color="secondary"
                            className="ml-4 lg:ml-0"
                            onClick={() => setShowUpgradeBanner(true)}>
                            {t("upgrade")}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {!isLoading && !data?.recordings?.total_count && <h1>No Recordings Found</h1>}
            </>
          ) : (
            <TeamsUpgradeRecordingBanner />
          )}
        </LicenseRequired>
        <DialogFooter>
          <DialogClose onClick={() => setShowUpgradeBanner(false)} className="border" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewRecordingsDialog;
