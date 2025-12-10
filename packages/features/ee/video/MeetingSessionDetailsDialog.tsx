"use client";

import { Suspense } from "react";

import dayjs from "@calcom/dayjs";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { PartialReference } from "@calcom/types/EventManager";
import { DialogContent, DialogFooter, DialogHeader, DialogClose } from "@calcom/ui/components/dialog";
import { SkeletonText } from "@calcom/ui/components/skeleton";

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];
type Session = RouterOutputs["viewer"]["calVideo"]["getMeetingInformation"]["data"][number];
type Participant = Session["participants"][number];

interface IMeetingSessionDetailsDialog {
  booking?: BookingItem;
  isOpenDialog: boolean;
  setIsOpenDialog: React.Dispatch<React.SetStateAction<boolean>>;
  timeFormat: number | null;
}

const MeetingSessionDetailsSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(2)].map((_, index) => (
        <div key={index} className="border-subtle flex w-full flex-col rounded-md border p-4">
          <div className="mb-3">
            <SkeletonText className="h-5 w-24" />
            <SkeletonText className="mt-1 h-4 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <SkeletonText className="h-4 w-16" />
                <SkeletonText className="mt-1 h-4 w-24" />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <SkeletonText className="mb-2 h-5 w-20" />
            <div className="stack-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="border-subtle rounded border p-2 text-sm">
                  <div className="flex justify-between">
                    <SkeletonText className="h-4 w-24" />
                    <SkeletonText className="h-4 w-16" />
                  </div>
                  <SkeletonText className="mt-1 h-3 w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const MeetingSessionDetailsList = ({ roomName }: { roomName: string }) => {
  const { t } = useLocale();

  const { data: meetingInfo, isLoading } = trpc.viewer.calVideo.getMeetingInformation.useQuery(
    { roomName },
    {
      suspense: true,
    }
  );

  if (isLoading) {
    return <MeetingSessionDetailsSkeleton />;
  }

  if (!meetingInfo || !meetingInfo.data || meetingInfo.data.length === 0) {
    return <p className="font-semibold">{t("no_meeting_sessions_found")}</p>;
  }

  const formatDuration = (totalSeconds: number) => {
    if (!totalSeconds) {
      return t("ongoing");
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (minutes > 0) {
      parts.push(`${minutes} ${t("minutes")}`);
    }
    if (seconds > 0) {
      parts.push(`${seconds} ${t("seconds")}`);
    }
    return parts.join(" ");
  };

  return (
    <div className="flex flex-col gap-4">
      {meetingInfo.data.map((session: Session, index: number) => (
        <div key={session.id} className="border-subtle flex w-full flex-col rounded-md border p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold">
              {t("meeting_session")} {index + 1}
            </h3>
            <p className="text-subtle text-sm">
              {t("session_id")}: {session.id}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">{t("start_time")}:</span>
              <p className="text-subtle">
                {session.start_time
                  ? dayjs(session.start_time * 1000).format("MMM D, YYYY h:mm A")
                  : t("not_available")}
              </p>
            </div>

            <div>
              <span className="font-medium">{t("duration")}:</span>
              <p className="text-subtle">
                {session.duration ? formatDuration(session.duration) : t("ongoing")}
              </p>
            </div>

            <div>
              <span className="font-medium">{t("max_participants")}:</span>
              <p className="text-subtle">{session.max_participants || t("unlimited")}</p>
            </div>

            <div>
              <span className="font-medium">{t("status")}:</span>
              <p className="text-subtle">{session.ongoing ? t("ongoing") : t("ended")}</p>
            </div>
          </div>

          {session.participants && session.participants.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium">{t("participants")}:</h4>
              <div className="stack-y-2">
                {session.participants.map((participant: Participant) => (
                  <div key={participant.participant_id} className="border-subtle rounded border p-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{participant.user_name || t("anonymous_user")}</span>
                      <span className="text-subtle">
                        {participant.join_time ? dayjs(participant.join_time * 1000).format("h:mm A") : ""}
                      </span>
                    </div>
                    <p className="text-subtle text-xs">
                      {t("user_id")}: {participant.user_id || t("not_available")}
                    </p>
                    <p className="text-subtle text-xs">
                      {t("participant_id")}: {participant.participant_id}
                    </p>
                    {participant.duration && (
                      <p className="text-subtle text-xs">
                        {t("session_duration")}: {formatDuration(participant.duration)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const MeetingSessionDetailsDialog = (props: IMeetingSessionDetailsDialog) => {
  const { t, i18n } = useLocale();
  const { isOpenDialog, setIsOpenDialog, booking, timeFormat } = props;

  const roomName =
    booking?.references?.find((reference: PartialReference) => reference.type === "daily_video")?.meetingId ??
    undefined;

  const subtitle = `${booking?.title} - ${dayjs(booking?.startTime).format("ddd")} ${dayjs(
    booking?.startTime
  ).format("D")}, ${dayjs(booking?.startTime).format("MMM")}`;

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow>
        <DialogHeader title={t("meeting_session_details")} subtitle={subtitle} />
        {roomName ? (
          <Suspense fallback={<MeetingSessionDetailsSkeleton />}>
            <MeetingSessionDetailsList roomName={roomName} />
          </Suspense>
        ) : (
          <p className="font-semibold">{t("no_meeting_sessions_found")}</p>
        )}
        <DialogFooter>
          <DialogClose className="border" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
