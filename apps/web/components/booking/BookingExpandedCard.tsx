"use client";

import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import { Checkbox } from "@calid/features/ui/components/input/checkbox-field";
import { triggerToast } from "@calid/features/ui/components/toast";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";

import { MeetingNotesDialog } from "@components/dialog/MeetingNotesDialog";

type BookingItem = RouterOutputs["viewer"]["bookings"]["calid_get"]["bookings"][number];

export type BookingItemProps = BookingItem & {
  isHost: boolean;
  showExpandedActions: boolean;
};

export function BookingExpandedCard(props: BookingItemProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [showRTE, setShowRTE] = useState(false);
  const { description: additionalNotes, id, startTime, endTime, responses } = props;

  const defaultFields = [
    "name",
    "email",
    // "attendeePhoneNumber",
    "location",
    "title",
    "notes",
    "guests",
    "rescheduleReason",
  ];

  const bookingFields = props.eventType.bookingFields;

  const customFields = {};

  if (responses) {
    if (responses["attendeePhoneNumber"] !== undefined) {
      customFields["Phone Number"] = responses["attendeePhoneNumber"];
    }

    for (const key in bookingFields) {
      if (bookingFields[key]?.label && !defaultFields.includes(key)) {
        // @ts-ignore
        if (responses[bookingFields[key].name] !== undefined) {
          customFields[bookingFields[key].label] = responses[bookingFields[key].name];
        }
      }
    }
  }

  const isBookingInPast = new Date(props.endTime) < new Date();
  const parsedMetadata = bookingMetadataSchema.safeParse(props.metadata ?? null);
  const meetingNote =
    parsedMetadata.success && parsedMetadata.data ? parsedMetadata.data.meetingNote : undefined;
  const [displayNotes, setDisplayNotes] = useState<string>(meetingNote || "");
  const [editingNotes, setEditingNotes] = useState<string>(meetingNote || "");
  const [showAttendeeDetails, setShowAttendeeDetails] = useState<string | null>(null);
  const [dialogPosition, setDialogPosition] = useState<{ top: number; left: number } | null>(null);
  const spanRefs = useRef<{ [key: string]: HTMLSpanElement | null }>({});
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveNotesMutation = trpc.viewer.bookings.saveNote.useMutation({
    onSuccess: async () => {
      setDisplayNotes(editingNotes);
      triggerToast(t("meeting_notes_saved"), "success");
      await utils.viewer.bookings.invalidate();
    },
  });

  const handleMeetingNoteSave = async (): Promise<void> => {
    await saveNotesMutation.mutate({ bookingId: props.id, meetingNote: editingNotes });
  };

  useEffect(() => {
    if (showRTE) {
      setEditingNotes(displayNotes);
    }
  }, [showRTE, displayNotes]);

  const [isNoShowDialogOpen, setIsNoShowDialogOpen] = useState<boolean>(false);
  const noShowMutation = trpc.viewer.loggedInViewerRouter.markNoShow.useMutation({
    onSuccess: async (data) => {
      triggerToast(t(data.message), "success");
      await utils.viewer.bookings.invalidate();
    },
    onError: (err) => {
      triggerToast(err.message, "error");
    },
  });

  const { copyToClipboard } = useCopy();

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

  const firstAttendee = props.attendees[0];

  const attendeeList = props.attendees.map((attendee) => {
    return {
      name: attendee.name,
      email: attendee.email,
      id: attendee.id,
      noShow: attendee.noShow || false,
      phoneNumber: attendee.phoneNumber,
      timeZone: attendee.timeZone,
    };
  });

  const popupRef = useRef<HTMLDivElement>(null);

  const attendeePhoneNo = isPrismaObjOrUndefined(responses)?.attendeePhoneNumber as string | undefined;
  const openWhatsAppChat = (phoneNumber: string) => {
    const width = 800;
    const height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    const options = `width=${width},height=${height},left=${left},top=${top},resizable,scrollbars=yes,status=1`;

    const generateWhatsAppLink = (phoneNumber: string): string => {
      const cleanedPhoneNumber = phoneNumber.replace(/\D/g, "");
      const urlEndcodedTextMessage = encodeURIComponent(
        `Hi, I'm running late by 5 minutes. I'll be there soon.`
      );

      // this opens the whatsapp web instead of defaulting to whatsapp app (linux doesn't support app)
      // const whatsappLink = `https://web.whatsapp.com/send?phone=${cleanedPhoneNumber}&text=${urlEndcodedTextMessage}`;

      const whatsappLink = `https://api.whatsapp.com/send?phone=${cleanedPhoneNumber}&text=${urlEndcodedTextMessage}`;
      return whatsappLink;
    };
    //Generating the whatsapp link
    const url = generateWhatsAppLink(phoneNumber);
    // Open the popup window with the provided URL and options
    window.open(url, "_blank", options);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowAttendeeDetails(null);
        setDialogPosition(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
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
        className="animate-fade-in border-muted bg-muted rounded-b-lg border-t"
        onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 lg:gap-8">
          <div className="space-y-4">
            <div>
              <div className="text-foreground text-sm font-medium">{t("duration")}</div>
              <div className="text-muted-foreground text-sm">
                {endTime && startTime
                  ? `${Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)} min`
                  : "-"}
              </div>
            </div>

            <div>
              <div className="text-foreground text-sm font-medium">{t("invitee_details")}</div>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <div className="flex min-w-0 items-center gap-2 overflow-auto">
                  <span>{firstAttendee?.name}</span>
                  <span>•</span>
                  <span>{firstAttendee?.timeZone}</span>
                  <span>•</span>
                  <span className="break-all">{firstAttendee?.email}</span>
                </div>
                <Button
                  StartIcon="copy"
                  color="minimal"
                  variant="icon"
                  size="xs"
                  onClick={() => {
                    copyToClipboard(firstAttendee?.email || "");
                    triggerToast(t("email_copied"), "success");
                  }}
                  aria-label="Copy email"
                />
              </div>
            </div>

            {attendeeList?.length > 1 && (
              <div>
                <div className="text-default text-sm font-medium">{t("attendees")}</div>
                <div className="flex flex-wrap gap-2">
                  {attendeeList.slice(1).map((attendee, index) => {
                    const idKey = `${id}-${index}`;
                    return (
                      <div key={idKey} className="relative">
                        <span
                          ref={(el) => (spanRefs.current[idKey] = el)}
                          className="text-default hover:bg-muted cursor-pointer rounded-md text-sm font-normal transition-colors"
                          aria-expanded={showAttendeeDetails === idKey}
                          onMouseEnter={() => {
                            if (hoverTimeoutRef.current) {
                              clearTimeout(hoverTimeoutRef.current);
                              hoverTimeoutRef.current = null;
                            }

                            const span = spanRefs.current[idKey];
                            if (span) {
                              const rect = span.getBoundingClientRect();
                              setDialogPosition({
                                top: rect.bottom + window.scrollY + 4,
                                left: rect.left + window.scrollX,
                              });
                            }
                            setShowAttendeeDetails(idKey);
                          }}
                          onMouseLeave={() => {
                            hoverTimeoutRef.current = setTimeout(() => {
                              setShowAttendeeDetails(null);
                              setDialogPosition(null);
                            }, 100);
                          }}>
                          {attendee.email.split(" ")[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {additionalNotes && (
              <div>
                <div className="text-foreground text-sm font-medium">{t("additional_notes")}</div>
                <div className="text-muted-foreground text-sm">{additionalNotes}</div>
              </div>
            )}

            {displayNotes && (
              <div>
                <div className="text-foreground text-sm font-medium">{t("meeting_notes")}</div>
                <div
                  className="text-muted-foreground prose prose-sm max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: displayNotes }}
                />
              </div>
            )}

            {Object.keys(customFields).length > 0 && (
              <div className="mt-2 space-y-3">
                {Object.entries(customFields).map(([label, value], index) => (
                  <div className="flex flex-col justify-between" key={index}>
                    <div className="text-foreground text-sm font-medium">{label}</div>
                    <div className="text-muted-foreground text-sm">
                      {Array.isArray(value)
                        ? value.join(", ")
                        : typeof value === "boolean"
                        ? value
                          ? "Yes"
                          : "No"
                        : value.toString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {props.showExpandedActions && (
            <div className="flex flex-col items-start space-y-2 lg:items-end">
              <MeetingNotesDialog
                notes={editingNotes}
                setNotes={setEditingNotes}
                isOpenDialog={showRTE}
                setIsOpenDialog={setShowRTE}
                handleMeetingNoteSave={handleMeetingNoteSave}
              />

              {isBookingInPast && (
                <Button
                  color="secondary"
                  className="min-w-40 justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkNoShow();
                  }}>
                  {t("mark_as_no_show")}
                </Button>
              )}
              {attendeePhoneNo && (
                <Button
                  color="secondary"
                  className="min-w-40 justify-center"
                  onClick={() => openWhatsAppChat(attendeePhoneNo)}>
                  {t("whatsapp_chat")}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {showAttendeeDetails &&
        dialogPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            className="border-border bg-default fixed z-[99999] min-w-48 space-y-2 rounded-md border p-2 shadow-xl"
            style={{
              top: `${dialogPosition.top}px`,
              left: `${dialogPosition.left}px`,
            }}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
            }}
            onMouseLeave={() => {
              setShowAttendeeDetails(null);
              setDialogPosition(null);
            }}>
            {(() => {
              const attendeeIndex = parseInt(showAttendeeDetails.split("-").pop() || "0") + 1;
              const attendee = attendeeList[attendeeIndex];

              if (!attendee) return null;

              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon name="mail" className="h-4 w-4" />
                    <span className="text-default text-sm font-normal">{attendee.email}</span>
                    <Button
                      onClick={() => {
                        copyToClipboard(attendee.email);
                      }}
                      StartIcon="copy"
                      color="minimal"
                      variant="icon"
                      size="xs"
                      tooltip={t("copy")}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="globe" className="h-4 w-4" />
                    <span className="text-default text-sm font-normal">{attendee.timeZone}</span>
                  </div>
                </div>
              );
            })()}
          </div>,
          document.body
        )}
    </>
  );
}

type NoShowAttendee = {
  id: number | string;
  email: string;
  name?: string | null;
  noShow?: boolean;
};

const NoShowAttendeesDialog = ({
  attendees,
  bookingUid,
  setDialog,
  setIsOpen,
  isOpen,
}: {
  attendees: Array<{
    name: string;
    email: string;
    id: number;
    noShow: boolean;
    phoneNumber: string | null;
    timeZone?: string;
  }>;
  bookingUid: string;
  setDialog: () => void;
  setIsOpen: (open: boolean) => void;
  isOpen: boolean;
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
      triggerToast(t(data.message), "success");
      await utils.viewer.bookings.invalidate();

      setLoading(false);
      setDialog();
    },
    onError: (err) => {
      triggerToast(err.message, "error");
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => setDialog()}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={(e) => e.stopPropagation()}>
        <div className="bg-default w-full max-w-md rounded-lg p-6 shadow-xl">
          <h2 className="mb-2 text-xl font-semibold">{t("mark_as_no_show_title")}</h2>
          <p className="mb-6 text-sm text-gray-600">{t("no_show_description")}</p>

          <div className="mb-6 space-y-4">
            {noShowAttendees.map((attendee, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg p-2 hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="bg-default flex h-7 w-7 items-center justify-center rounded-full">
                    <span className="text-default text-sm font-medium">
                      {(attendee.name || attendee?.email).charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{attendee?.name || attendee?.email}</span>
                </div>

                <Checkbox
                  key={attendee.email}
                  checked={attendee.noShow}
                  onCheckedChange={(checked) => {
                    setNoShowAttendees((prev) =>
                      prev.map((a) => (a.email === attendee.email ? { ...a, noShow: checked === true } : a))
                    );
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3">
            <Button color="secondary" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button
              loading={loading}
              onClick={(e) => {
                e.preventDefault();
                setLoading(true);
                noShowAttendees.forEach((attendee) => {
                  const originalAttendee = attendees.find((e) => e.email === attendee.email);
                  if (originalAttendee && originalAttendee.noShow !== attendee.noShow) {
                    noShowMutation.mutate({
                      bookingUid,
                      attendees: [{ email: attendee.email, noShow: attendee.noShow }],
                    });
                  }
                });
              }}>
              {t("mark_as_no_show")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
