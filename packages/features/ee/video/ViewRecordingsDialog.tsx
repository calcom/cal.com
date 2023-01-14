import { useSession } from "next-auth/react";
import { useState } from "react";

import dayjs from "@calcom/dayjs";
import LicenseRequired from "@calcom/features/ee/common/components/v2/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RecordingItemSchema } from "@calcom/prisma/zod-utils";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
import type { PartialReference } from "@calcom/types/EventManager";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui";
import { Button, showToast, Icon } from "@calcom/ui";

import RecordingListSkeleton from "./components/RecordingListSkeleton";
import UpgradeRecordingBanner from "./components/UpgradeRecordingBanner";

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

interface IViewRecordingsDialog {
  booking?: BookingItem;
  isOpenDialog: boolean;
  setIsOpenDialog: React.Dispatch<React.SetStateAction<boolean>>;
  timeFormat: number | null;
}

function convertSecondsToMs(seconds: number) {
  // Bitwise Double Not is faster than Math.floor
  const minutes = ~~(seconds / 60);
  const extraSeconds = seconds % 60;
  return `${minutes}min  ${extraSeconds}sec`;
}

interface GetTimeSpanProps {
  startTime: string | undefined;
  endTime: string | undefined;
  locale: string;
  isTimeFormatAMPM: boolean;
}

const getTimeSpan = ({ startTime, endTime, locale, isTimeFormatAMPM }: GetTimeSpanProps) => {
  if (!startTime || !endTime) return "";

  const formattedStartTime = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "numeric",
    hour12: isTimeFormatAMPM,
  }).format(new Date(startTime));

  const formattedEndTime = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "numeric",
    hour12: isTimeFormatAMPM,
  }).format(new Date(endTime));

  return `${formattedStartTime} - ${formattedEndTime}`;
};

export const ViewRecordingsDialog = (props: IViewRecordingsDialog) => {
  const { t, i18n } = useLocale();
  const { isOpenDialog, setIsOpenDialog, booking, timeFormat } = props;
  const [downloadingRecordingId, setRecordingId] = useState<string | null>(null);
  const session = useSession();
  const belongsToActiveTeam = session?.data?.user?.belongsToActiveTeam ?? false;
  const [showUpgradeBanner, setShowUpgradeBanner] = useState<boolean>(false);
  const roomName =
    booking?.references?.find((reference: PartialReference) => reference.type === "daily_video")?.meetingId ??
    undefined;

  const { data: recordings, isLoading } = trpc.viewer.getCalVideoRecordings.useQuery(
    { roomName: roomName ?? "" },
    { enabled: !!roomName && isOpenDialog }
  );
  const handleDownloadClick = async (recordingId: string) => {
    try {
      setRecordingId(recordingId);
      const res = await fetch(`/api/download-cal-video-recording?recordingId=${recordingId}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      const respBody = await res.json();

      if (respBody?.download_link) {
        window.location.href = respBody.download_link;
      }
    } catch (err) {
      console.error(err);
      showToast(t("something_went_wrong"), "error");
    }
    setRecordingId(null);
  };

  const subtitle = `${booking?.title} - ${dayjs(booking?.startTime).format("ddd")} ${dayjs(
    booking?.startTime
  ).format("D")}, ${dayjs(booking?.startTime).format("MMM")} ${getTimeSpan({
    startTime: booking?.startTime,
    endTime: booking?.endTime,
    locale: i18n.language,
    isTimeFormatAMPM: timeFormat === 12,
  })} `;

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent>
        <DialogHeader title={t("recordings_title")} subtitle={subtitle} />
        <LicenseRequired>
          {showUpgradeBanner && <UpgradeRecordingBanner />}
          {!showUpgradeBanner && (
            <>
              {isLoading && <RecordingListSkeleton />}
              {recordings && "data" in recordings && recordings?.data?.length > 0 && (
                <div className="flex flex-col gap-3">
                  {recordings.data.map((recording: RecordingItemSchema, index: number) => {
                    return (
                      <div
                        className="flex w-full items-center justify-between rounded-md border py-2 px-4"
                        key={recording.id}>
                        <div className="flex flex-col">
                          <h1 className="text-sm font-semibold">
                            {t("recording")} {index + 1}
                          </h1>
                          <p className="text-sm font-normal text-gray-500">
                            {convertSecondsToMs(recording.duration)}
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
                            tooltip={t("recordings_are_part_of_the_teams_plan")}
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
              {!isLoading &&
                (!recordings ||
                  (recordings && "total_count" in recordings && recordings?.total_count === 0)) && (
                  <h1 className="font-semibold">No Recordings Found</h1>
                )}
            </>
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
