"use client";

import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import { triggerToast } from "@calid/features/ui/components/toast";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";

type BookingItem = RouterOutputs["viewer"]["bookings"]["calid_get"]["bookings"][number];

export type BookingItemProps = BookingItem & {
  isHost: boolean;
  showExpandedActions: boolean;
};

export function BookingExpandedCard(props: BookingItemProps) {
  const { t } = useLocale();
  const { id, startTime, endTime, responses, rating, ratingFeedback } = props;
  const defaultFields = ["name", "email", "location", "title", "guests"];
  const bookingFields = props.eventType.bookingFields;

  const defaultLabels = {
    attendeePhoneNumber: t("phone_number"),
    rescheduleReason: t("reschedule_reason"),
    notes: t("additional_notes"),
  };

  const customFields = {};

  if (responses) {
    for (const key in bookingFields) {
      if (!defaultFields.includes(bookingFields[key].name)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (responses[bookingFields[key].name] !== undefined) {
          let label = null;
          if (bookingFields[key]?.label) {
            label = bookingFields[key].label;
          } else if (defaultLabels[bookingFields[key].name]) {
            label = defaultLabels[bookingFields[key].name];
          }
          if (label) {
            customFields[label] = responses[bookingFields[key].name];
          }
        }
      }
    }
  }

  const parsedMetadata = bookingMetadataSchema.safeParse(props.metadata ?? null);
  const meetingNote =
    parsedMetadata.success && parsedMetadata.data ? parsedMetadata.data.meetingNote : undefined;
  const [displayNotes, setDisplayNotes] = useState<string>(meetingNote || "");

  useEffect(() => {
    setDisplayNotes(meetingNote || "");
  }, [meetingNote]);

  const hasMeetingNotesContent = (html: string | null | undefined): boolean => {
    if (!html) return false;
    const stripped = html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, "")
      .trim();
    return stripped.length > 0;
  };
  const [showAttendeeDetails, setShowAttendeeDetails] = useState<string | null>(null);
  const [dialogPosition, setDialogPosition] = useState<{ top: number; left: number } | null>(null);
  const spanRefs = useRef<{ [key: string]: HTMLSpanElement | null }>({});
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { copyToClipboard } = useCopy();

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
      <div
        className="animate-fade-in border-muted rounded-b-lg border-t bg-gray-50"
        onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 lg:gap-8">
          <div className="space-y-4">
            <div>
              <h3 className="text-default text-sm font-medium">{t("duration")}</h3>
              <div className="text-default text-sm">
                {endTime && startTime
                  ? `${Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)} min`
                  : "-"}
              </div>
            </div>

            {firstAttendee && (
              <div>
                <h3 className="text-default text-sm font-medium">{t("invitee_details")}</h3>
                <div className="text-default flex flex-wrap items-center gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline">•</span>
                    <span className="truncate sm:max-w-[200px]">{firstAttendee.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline">•</span>
                    <span className="break-words sm:max-w-[180px] sm:truncate">{firstAttendee.timeZone}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="inline">•</span>
                    <span className="break-all sm:max-w-[240px] sm:truncate">{firstAttendee.email}</span>
                    <Button
                      StartIcon="copy"
                      color="minimal"
                      variant="icon"
                      size="xs"
                      onClick={() => {
                        copyToClipboard(firstAttendee.email);
                        triggerToast(t("email_copied"), "success");
                      }}
                      aria-label="Copy email"
                    />
                  </div>
                </div>
              </div>
            )}

            {attendeeList?.length > 1 && (
              <div>
                <h3 className="text-default text-sm font-medium">{t("attendees")}</h3>
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

            {hasMeetingNotesContent(displayNotes) && (
              <div>
                <h3 className="text-default text-sm font-medium">{t("meeting_notes")}</h3>
                <div
                  className="text-default prose prose-sm max-w-none text-sm"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: markdownToSafeHTML(displayNotes) }}
                />
              </div>
            )}

            {Object.keys(customFields).length > 0 && (
              <div className="mt-2 space-y-3">
                {Object.entries(customFields).map(([label, value], index) => (
                  <div className="flex flex-col justify-between" key={index}>
                    <h3 className="text-default text-sm font-medium">{label}</h3>
                    <div className="text-default text-sm">
                      {(() => {
                        const renderValue = (val: any) => {
                          if (Array.isArray(val)) {
                            if (val.length === 0) return null;
                            if (typeof val[0] === "object" && val[0] !== null && "url" in val[0]) {
                              return (
                                <ul className="list-inside list-disc">
                                  {val.map((item: any, i: number) => (
                                    <li key={i}>
                                      <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline">
                                        {item.name || "Attachment"}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              );
                            }
                            return val.join(", ");
                          }
                          if (typeof val === "object" && val !== null && "url" in val) {
                            return (
                              <a
                                href={val.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline">
                                {val.name || "Attachment"}
                              </a>
                            );
                          }
                          if (typeof val === "boolean") {
                            return val ? t("yes") : t("no");
                          }
                          return val.toString();
                        };
                        return renderValue(value);
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(rating || ratingFeedback) && (
              <div>
                <h3 className="text-default text-sm font-medium">{t("rating")}</h3>
                <div className="text-default flex items-center gap-2 text-sm">
                  {rating && (
                    <span className="text-lg" role="img" aria-label={t("rating")}>
                      {[undefined, "😠", "🙁", "😐", "😄", "😍"][rating]}
                    </span>
                  )}
                  {ratingFeedback && (
                    <span className="text-default text-sm font-normal">- {ratingFeedback}</span>
                  )}
                </div>
              </div>
            )}
          </div>
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
