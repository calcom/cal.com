import { useState, Suspense } from "react";

import dayjs from "@calcom/dayjs";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import useHasPaidPlan from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RecordingItemSchema } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { PartialReference } from "@calcom/types/EventManager";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  UpgradeTeamsBadge,
} from "@calcom/ui";
import { Button } from "@calcom/ui";
import { Download } from "@calcom/ui/components/icon";

import RecordingListSkeleton from "./components/RecordingListSkeleton";

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
  hour12: boolean;
}

const getTimeSpan = ({ startTime, endTime, locale, hour12 }: GetTimeSpanProps) => {
  if (!startTime || !endTime) return "";

  const formattedStartTime = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "numeric",
    hour12,
  }).format(new Date(startTime));

  const formattedEndTime = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "numeric",
    hour12,
  }).format(new Date(endTime));

  return `${formattedStartTime} - ${formattedEndTime}`;
};

const useRecordingDownload = () => {
  const [recordingId, setRecordingId] = useState("");
  const { isFetching, data } = trpc.viewer.getDownloadLinkOfCalVideoRecordings.useQuery(
    {
      recordingId,
    },
    {
      enabled: !!recordingId,
      cacheTime: 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
      onSuccess: (data) => {
        if (data && data.download_link) {
          window.location.href = data.download_link;
        }
      },
    }
  );

  return {
    setRecordingId: (newRecordingId: string) => {
      // may be a way to do this by default, but this is easy enough.
      if (recordingId === newRecordingId && data) {
        window.location.href = data.download_link;
      }
      if (!isFetching) {
        setRecordingId(newRecordingId);
      }
      // assume it is still fetching, do nothing.
    },
    isFetching,
    recordingId,
  };
};

const ViewRecordingsList = ({ roomName, hasPaidPlan }: { roomName: string; hasPaidPlan: boolean }) => {
  const { t } = useLocale();
  const { setRecordingId, isFetching, recordingId } = useRecordingDownload();

  const { data: recordings } = trpc.viewer.getCalVideoRecordings.useQuery(
    { roomName },
    {
      suspense: true,
    }
  );

  const handleDownloadClick = async (recordingId: string) => {
    // this would enable the getDownloadLinkOfCalVideoRecordings
    setRecordingId(recordingId);
  };

  return (
    <>
      {recordings && "data" in recordings && recordings?.data?.length > 0 ? (
        <div className="flex flex-col gap-3">
          {recordings.data.map((recording: RecordingItemSchema, index: number) => {
            return (
              <div
                className="flex w-full items-center justify-between rounded-md border px-4 py-2"
                key={recording.id}>
                <div className="flex flex-col">
                  <h1 className="text-sm font-semibold">
                    {t("recording")} {index + 1}
                  </h1>
                  <p className="text-subtle text-sm font-normal">{convertSecondsToMs(recording.duration)}</p>
                </div>
                {hasPaidPlan ? (
                  <Button
                    StartIcon={Download}
                    className="ml-4 lg:ml-0"
                    loading={isFetching && recordingId === recording.id}
                    onClick={() => handleDownloadClick(recording.id)}>
                    {t("download")}
                  </Button>
                ) : (
                  <UpgradeTeamsBadge />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        (!recordings || (recordings && "total_count" in recordings && recordings?.total_count === 0)) && (
          <p className="font-semibold">{t("no_recordings_found")}</p>
        )
      )}
    </>
  );
};

export const ViewRecordingsDialog = (props: IViewRecordingsDialog) => {
  const { t, i18n } = useLocale();
  const { isOpenDialog, setIsOpenDialog, booking, timeFormat } = props;

  const { hasPaidPlan, isLoading: isTeamPlanStatusLoading } = useHasPaidPlan();

  const roomName =
    booking?.references?.find((reference: PartialReference) => reference.type === "daily_video")?.meetingId ??
    undefined;

  const subtitle = `${booking?.title} - ${dayjs(booking?.startTime).format("ddd")} ${dayjs(
    booking?.startTime
  ).format("D")}, ${dayjs(booking?.startTime).format("MMM")} ${getTimeSpan({
    startTime: booking?.startTime,
    endTime: booking?.endTime,
    locale: i18n.language,
    hour12: timeFormat === 12,
  })} `;

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent>
        <DialogHeader title={t("recordings_title")} subtitle={subtitle} />
        {roomName ? (
          <LicenseRequired>
            {isTeamPlanStatusLoading ? (
              <RecordingListSkeleton />
            ) : (
              <Suspense fallback={<RecordingListSkeleton />}>
                <ViewRecordingsList hasPaidPlan={!!hasPaidPlan} roomName={roomName} />
              </Suspense>
            )}
          </LicenseRequired>
        ) : (
          <p className="font-semibold">{t("no_recordings_found")}</p>
        )}
        <DialogFooter>
          <DialogClose className="border" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewRecordingsDialog;
