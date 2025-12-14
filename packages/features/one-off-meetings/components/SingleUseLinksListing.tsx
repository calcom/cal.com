"use client";

import { useState } from "react";

import dayjs from "@calcom/dayjs";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { OneOffMeetingStatus } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonButton, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

export function SingleUseLinksListing() {
  const { t } = useLocale();
  const { copyToClipboard } = useCopy();
  const utils = trpc.useUtils();

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = trpc.viewer.oneOffMeetings.list.useQuery(undefined, {
    staleTime: 30000, // Cache for 30 seconds
  });

  const deleteMutation = trpc.viewer.oneOffMeetings.delete.useMutation({
    onSuccess: () => {
      showToast(t("one_off_meeting_deleted"), "success");
      utils.viewer.oneOffMeetings.list.invalidate();
      setDeleteId(null);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const handleCopyLink = (linkHash: string) => {
    const link = `${window.location.origin}/one-off/${linkHash}`;
    copyToClipboard(link);
    showToast(t("link_copied_to_clipboard"), "success");
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  const getStatusBadge = (status: OneOffMeetingStatus) => {
    switch (status) {
      case OneOffMeetingStatus.ACTIVE:
        return <Badge variant="success">{t("meeting_active")}</Badge>;
      case OneOffMeetingStatus.BOOKED:
        return <Badge variant="blue">{t("meeting_booked")}</Badge>;
      case OneOffMeetingStatus.EXPIRED:
        return <Badge variant="gray">{t("meeting_expired")}</Badge>;
      case OneOffMeetingStatus.CANCELLED:
        return <Badge variant="red">{t("meeting_cancelled")}</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="border-subtle divide-subtle divide-y rounded-md border">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div className="space-y-2">
              <SkeletonText className="h-5 w-48" />
              <SkeletonText className="h-4 w-32" />
            </div>
            <SkeletonButton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  const meetings = data?.items ?? [];

  return (
    <>
      {meetings.length === 0 ? (
        <EmptyScreen
          Icon="link"
          headline={t("no_single_use_links")}
          description={t("no_single_use_links_description")}
          buttonRaw={
            <Button href="/one-off/create" target="_blank" StartIcon="plus">
              {t("create_one_off_meeting")}
            </Button>
          }
        />
      ) : (
        <div className="border-subtle divide-subtle divide-y rounded-md border">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="hover:bg-subtle/50 flex items-center justify-between p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-emphasis font-medium">{meeting.title}</h3>
                  {getStatusBadge(meeting.status)}
                </div>
                <div className="text-subtle mt-2 flex flex-wrap items-center gap-2">
                  <Tooltip content={t("created_on")}>
                    <span className="text-subtle flex cursor-default items-center gap-1 text-sm">
                      <Icon name="calendar" className="h-4 w-4" />
                      {dayjs(meeting.createdAt).format("MMM D, YYYY")}
                    </span>
                  </Tooltip>
                  <Badge variant="gray" startIcon="clock">
                    {meeting.duration}m
                  </Badge>
                  <Badge variant="gray" startIcon="layers">
                    {meeting.offeredSlots.length} {t("time_slots_offered")}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {meeting.status === OneOffMeetingStatus.ACTIVE && (
                  <>
                    <Tooltip content={t("copy_link")}>
                      <Button
                        variant="icon"
                        color="secondary"
                        onClick={() => handleCopyLink(meeting.linkHash)}
                        StartIcon="copy"
                      />
                    </Tooltip>
                    <Tooltip content={t("view_booking_page")}>
                      <Button
                        variant="icon"
                        color="secondary"
                        onClick={() => window.open(`/one-off/${meeting.linkHash}`, "_blank")}
                        StartIcon="external-link"
                      />
                    </Tooltip>
                  </>
                )}

                {meeting.status === OneOffMeetingStatus.BOOKED && meeting.booking && (
                  <Button
                    variant="button"
                    color="secondary"
                    onClick={() => window.open(`/booking/${meeting.booking?.uid}`, "_blank")}
                    StartIcon="calendar">
                    {t("view_meeting")}
                  </Button>
                )}

                {/* Hide delete for booked meetings that haven't happened yet */}
                {!(
                  meeting.status === OneOffMeetingStatus.BOOKED &&
                  meeting.booking &&
                  dayjs(meeting.booking.startTime).isAfter(dayjs())
                ) && (
                  <Tooltip content={t("delete")}>
                    <Button
                      variant="icon"
                      color="destructive"
                      onClick={() => setDeleteId(meeting.id)}
                      StartIcon="trash"
                    />
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("delete_one_off_meeting")}
          confirmBtnText={t("delete")}
          onConfirm={handleDelete}
          isPending={deleteMutation.isPending}>
          {t("delete_one_off_meeting_description")}
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}
