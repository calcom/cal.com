"use client";

// adjust import path
import { Button } from "@calid/features/ui";
import { Checkbox } from "@calid/features/ui";
import React, { useState, useRef, useEffect } from "react";

import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterInputs, RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

export type BookingItemProps = BookingItem & {
  isHost: boolean;
  showExpandedActions: boolean;
  setSelectedMeeting: (booking: BookingItemProps | null) => void;
  setShowMeetingNotes: (show: boolean) => void;
  handleMarkNoShow: () => void;
  isCurrentTime: (time: Date) => boolean;
};

export function BookingExpandedCard(props: BookingItemProps) {
  const { description: additionalNotes, id, startTime, endTime } = props;

  const isBookingInPast = new Date(props.endTime) < new Date();

  const [isNoShowDialogOpen, setIsNoShowDialogOpen] = useState<boolean>(false);
  const noShowMutation = trpc.viewer.loggedInViewerRouter.markNoShow.useMutation({
    onSuccess: async (data) => {
      showToast(t(data.message), "success");
      await utils.viewer.bookings.invalidate();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const {
    t,
    i18n: { language },
  } = useLocale();
  const utils = trpc.useUtils();

  const [showAttendeeDetails, setShowAttendeeDetails] = useState<string | null>(null);
  const { copyToClipboard } = useCopy();

  const showExpandedActions = true;

  const setSelectedMeeting = (booking: BookingItemProps | null) => {};
  const setShowMeetingNotes = (show: boolean) => {};

  const handleMarkNoShow = () => {
    if (attendeeList.length === 1) {
      const attendee = attendeeList[0];
      noShowMutation.mutate({
        bookingUid: props.uid,
        attendees: [{ email: attendee.email, noShow: !attendee.noShow }],
      });
      return;
    }
    setIsNoShowDialogOpen(true);
  };

  const isCurrentTime = (time: Date) => true; // assume always true for demo

  const firstAttendee = props.attendees[0];

  const attendeeList = props.attendees.map((attendee) => {
    return {
      name: attendee.name,
      email: attendee.email,
      id: attendee.id,
      noShow: attendee.noShow || false,
      phoneNumber: attendee.phoneNumber,
    };
  });

  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowAttendeeDetails(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      {isNoShowDialogOpen && (
        <NoShowAttendeesDialog
          bookingUid={props.uid}
          setDialog={() => setIsNoShowDialogOpen(false)}
          attendees={attendeeList}
          setIsOpen={setIsNoShowDialogOpen}
          isOpen={isNoShowDialogOpen}
        />
      )}
      <div
        className="border-border animate-fade-in rounded-b-lg border-t bg-[#f1f5f980]"
        onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-2 gap-8 p-4">
          <div className="space-y-4">
            <div>
              <div className="text-foreground mb-1 text-sm font-medium">Duration</div>
              <div className="text-muted-foreground text-sm">
                {endTime && startTime
                  ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000) + " min"
                  : "-"}
              </div>
            </div>

            <div>
              <div className="text-foreground mb-2 text-sm font-medium">Invitee Details</div>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <span>{firstAttendee?.name}</span>
                <span>•</span>
                <span>{firstAttendee?.timeZone}</span>
                <span>•</span>
                <span>{firstAttendee?.email}</span>
                <button
                  onClick={() => {
                    copyToClipboard(firstAttendee?.email || "");
                    showToast(t("email_copied"), "success");
                  }}
                  className="text-muted-foreground hover:text-foreground ml-1"
                  aria-label="Copy email">
                  <Icon name="copy" className="h-3 w-3" />
                </button>
              </div>
            </div>

            {attendeeList?.length > 1 && (
              <div>
                <div className="text-foreground mb-2 text-sm font-medium">Attendees</div>
                <div className="flex flex-wrap gap-2">
                  {attendeeList.slice(1).map((attendee, index) => {
                    const idKey = `${id}-${index}`;
                    return (
                      <div key={idKey} className="relative">
                        <button
                          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full px-3 py-1 text-sm transition-all hover:shadow-sm"
                          onClick={() => setShowAttendeeDetails(showAttendeeDetails === idKey ? null : idKey)}
                          aria-expanded={showAttendeeDetails === idKey}>
                          {attendee.email.split(" ")[0]}
                        </button>
                        {showAttendeeDetails === idKey && (
                          <div
                            ref={popupRef}
                            className="bg-popover border-border min-w-64 bg-default fixed left-[calculated-left] top-[calculated-top] z-[9999] mt-1 space-y-2 rounded-md border p-3 shadow-lg"
                            style={
                              {
                                // You may need to calculate position dynamically based on button position
                              }
                            }>
                            <div className="flex items-center gap-2">
                              <Icon name="mail" className="text-muted-foreground h-4 w-4" />
                              <span className="text-foreground text-sm">{attendee.email}</span>
                              <button
                                onClick={() => copyToClipboard(attendee.email)}
                                className="text-muted-foreground hover:text-foreground ml-1"
                                aria-label="Copy email">
                                <Icon name="copy" className="h-3 w-3" />
                              </button>
                            </div>
                            {attendee.timeZone && (
                              <div className="flex items-center gap-2">
                                <Icon name="globe" className="text-muted-foreground h-4 w-4" />
                                <span className="text-foreground text-sm">{attendee.timeZone}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {additionalNotes && (
              <div>
                <div className="text-foreground mb-2 text-sm font-medium">Additional Notes</div>
                <div className="text-muted-foreground text-sm">{additionalNotes}</div>
              </div>
            )}
          </div>

          {/* Action Buttons for Expanded View */}
          {showExpandedActions && (
            <div className="flex flex-col items-end space-y-2">
              <Button
                variant="outline"
                size="default"
                className="w-40"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMeeting(props);
                  setShowMeetingNotes(true);
                }}>
                {t("your_notes")}
              </Button>
              {isBookingInPast && (
                <Button
                  variant="outline"
                  size="default"
                  className="w-40"
                  style={{
                    backgroundColor: "#007ee5",
                    color: "white",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkNoShow();
                  }}>
                  {t("mark_as_no_show")}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const NoShowAttendeesDialog = ({
  attendees,
  bookingUid,
  setDialog,
}: {
  attendees: [];
  bookingUid: string;
  setDialog: () => {};
}) => {
  const { t } = useLocale();
  const [noShowAttendees, setNoShowAttendees] = useState(
    attendees.map((attendee) => ({
      id: attendee.id,
      email: attendee.email,
      name: attendee.name,
      noShow: attendee.noShow || false,
    }))
  );

  const [loading, setLoading] = useState(false);

  const utils = trpc.useUtils();
  const noShowMutation = trpc.viewer.loggedInViewerRouter.markNoShow.useMutation({
    onSuccess: async (data) => {
      const newValue = data.attendees[0];
      setNoShowAttendees((old) =>
        old.map((attendee) =>
          attendee.email === newValue.email ? { ...attendee, noShow: newValue.noShow } : attendee
        )
      );
      showToast(t(data.message), "success");
      await utils.viewer.bookings.invalidate();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h2 className="mb-2 text-xl font-semibold">Mark as No-Show</h2>
          <p className="mb-6 text-sm text-gray-600">Select attendees to mark as no-show</p>

          <div className="mb-6 space-y-4">
            {noShowAttendees.map((attendee, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg p-2 hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
                    <span className="text-sm font-medium text-white">
                      {(attendee.name || attendee?.email).charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{attendee?.name || attendee?.email}</span>
                </div>

                <Checkbox
                  key={attendee.email}
                  checked={attendee.noShow}
                  onCheckedChange={(e) => {
                    console.log("Checkbox changed:", e);
                    setNoShowAttendees((prev) =>
                      prev.map((a) => (a.email === attendee.email ? { ...a, noShow: e } : a))
                    );
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setDialog()}>
              Cancel
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault();
                console.log("No Show Attendees:", noShowAttendees);
                setLoading(true);
                noShowAttendees.forEach((attendee) => {
                  noShowMutation.mutate({
                    bookingUid,
                    attendees: [{ email: attendee.email, noShow: attendee.noShow }],
                  });
                });
                setLoading(false);
                setDialog();
              }}>
              Mark as No-Show
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
