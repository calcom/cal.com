import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@calid/features/ui/components/dialog";
import { Separator } from "@calid/features/ui/components/separator";
import { differenceInMinutes, format } from "date-fns";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  MapPin,
  RefreshCcw,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { useState } from "react";

import { guessEventLocationType } from "@calcom/app-store/locations";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { UnifiedCalendarEventVM } from "../lib/types";

const getHumanReadableLocation = (location: string) => {
  if (!location.startsWith("integrations:")) {
    return location;
  }

  return guessEventLocationType(location)?.label ?? location;
};

interface UnifiedCalendarEventDetailsPanelProps {
  event: UnifiedCalendarEventVM;
  onReschedule: () => void;
  onCancel: () => void;
  conflicts: UnifiedCalendarEventVM[];
  isReschedulePending?: boolean;
  isCancelPending?: boolean;
}

export const UnifiedCalendarEventDetailsPanel = ({
  event,
  onReschedule,
  onCancel,
  conflicts,
  isReschedulePending,
  isCancelPending,
}: UnifiedCalendarEventDetailsPanelProps) => {
  const { t } = useLocale();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const statusLabel = event.status.charAt(0) + event.status.slice(1).toLowerCase();
  const attendeeEmails = event.attendees ?? [];
  const providerLabel = event.provider
    ? event.provider === "google"
      ? t("unified_calendar_provider_google")
      : t("unified_calendar_provider_outlook")
    : event.source;
  const calendarLabel = event.calendarName?.trim() || t("calendar");
  const subtitleLabel = event.source === "EXTERNAL" ? `${providerLabel} · ${calendarLabel}` : calendarLabel;
  const locationLabel = event.location ? getHumanReadableLocation(event.location) : null;
  // const description = event.description?.trim();
  // const descriptionHasHtml = Boolean(description && /<\/?[a-z][\s\S]*>/i.test(description));
  // const sanitizedDescriptionHtml = descriptionHasHtml && description ? DOMPurify.sanitize(description) : null;

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div
            className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full opacity-70"
            style={{ backgroundColor: event.color }}
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground text-base font-semibold">{event.title}</h3>
            <p
              className="text-muted-foreground mt-0.5 overflow-hidden whitespace-normal break-words text-xs [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box]"
              title={subtitleLabel}>
              {subtitleLabel}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] font-medium uppercase">
                {statusLabel}
              </Badge>
              {event.isReadOnly && (
                <Badge variant="secondary" className="text-[10px] font-medium uppercase">
                  Read-only
                </Badge>
              )}
            </div>
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className="text-destructive/80 bg-destructive/5 border-destructive/10 flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {t("unified_calendar_overlaps_with_conflicts", {
                conflicts: conflicts.map((conflict) => conflict.title).join(", "),
              })}
            </span>
          </div>
        )}

        <Separator className="bg-border/40" />

        <div className="space-y-3">
          <div className="text-foreground/80 flex items-center gap-3 text-sm">
            <CalendarIcon className="text-muted-foreground/60 h-3.5 w-3.5 shrink-0" />
            <span>{format(event.start, "EEEE, MMMM d, yyyy")}</span>
          </div>

          <div className="text-foreground/80 flex items-center gap-3 text-sm">
            <Clock className="text-muted-foreground/60 h-3.5 w-3.5 shrink-0" />
            <span>
              {event.isAllDay
                ? t("unified_calendar_all_day")
                : `${format(event.start, "h:mm a")} – ${format(event.end, "h:mm a")} · ${differenceInMinutes(
                    event.end,
                    event.start
                  )} ${t("unified_calendar_minutes_abbreviation")}`}
            </span>
          </div>

          {locationLabel && (
            <div className="text-foreground/80 flex items-center gap-3 text-sm">
              <MapPin className="text-muted-foreground/60 h-3.5 w-3.5 shrink-0" />
              <span>{locationLabel}</span>
            </div>
          )}

          {event.meetingUrl && (
            <div className="flex items-center gap-3 text-sm">
              <Video className="text-muted-foreground/60 h-3.5 w-3.5 shrink-0" />
              <a
                href={event.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary flex items-center gap-1 text-sm hover:underline">
                {t("join_meeting")} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {(event.attendeeCount && event.attendeeCount > 0) || attendeeEmails.length > 0 ? (
            <div className="flex items-start gap-3 text-sm">
              <Users className="text-muted-foreground/60 mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="space-y-2">
                <span className="text-muted-foreground/80">
                  {t("unified_calendar_attendees_count", {
                    count: attendeeEmails.length > 0 ? attendeeEmails.length : event.attendeeCount,
                  })}
                </span>
                {attendeeEmails.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {attendeeEmails.map((email) => (
                      <Badge key={email} variant="secondary" className="text-[10px] font-medium">
                        {email}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* {(descriptionHasHtml && sanitizedDescriptionHtml) || description ? (
          <div className="pl-7 pt-1">
            <p className="text-foreground/80 mb-1 text-xs font-medium uppercase tracking-wide">
              Meeting description
            </p>
            {descriptionHasHtml && sanitizedDescriptionHtml ? (
              <div
                className="text-muted-foreground/80 rounded-md bg-muted/30 px-3 py-2 text-sm"
                dangerouslySetInnerHTML={{ __html: sanitizedDescriptionHtml }}
              />
            ) : (
              description && (
                <p className="text-muted-foreground/80 rounded-md bg-muted/30 px-3 py-2 text-sm">{description}</p>
              )
            )}
          </div>
        ) : null} */}
        </div>

        <Separator className="bg-border/40" />

        <div className="flex items-center gap-2">
          {event.canReschedule && (
            <Button
              color="secondary"
              size="sm"
              className="border-border/60 h-8 gap-1.5 text-xs"
              onClick={onReschedule}
              disabled={isReschedulePending || isCancelPending}>
              <RefreshCcw className="h-3 w-3" />{" "}
              {isReschedulePending ? t("unified_calendar_saving") : t("reschedule")}
            </Button>
          )}

          {event.canDelete && (
            <Button
              color="minimal"
              size="sm"
              className="text-destructive/70 hover:text-destructive border-border/60 h-8 gap-1.5 text-xs"
              onClick={() => setIsCancelConfirmOpen(true)}
              disabled={isCancelPending || isReschedulePending}>
              <Trash2 className="h-3 w-3" />{" "}
              {isCancelPending ? t("unified_calendar_cancelling") : t("unified_calendar_cancel_booking")}
            </Button>
          )}

          {event.isReadOnly && (
            <p className="text-muted-foreground/70 text-xs">
              {t("unified_calendar_event_managed_in_external_calendar")}
            </p>
          )}

          {event.meetingUrl && (
            <Button
              className="ml-auto h-8 gap-1.5 text-xs"
              href={event.meetingUrl}
              target="_blank"
              rel="noreferrer">
              <Video className="h-3 w-3" /> {t("unified_calendar_join")}
            </Button>
          )}
        </div>
      </div>

      <Dialog
        open={isCancelConfirmOpen}
        onOpenChange={(open) => !isCancelPending && setIsCancelConfirmOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader showIcon iconName="triangle-alert" iconVariant="warning">
            <DialogTitle className="text-sm">{t("unified_calendar_cancel_booking")}</DialogTitle>
            <DialogDescription>{t("unified_calendar_cancel_booking_confirmation")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <DialogClose color="secondary" disabled={isCancelPending}>
              {t("back")}
            </DialogClose>
            <Button color="destructive" onClick={onCancel} disabled={isCancelPending || isReschedulePending}>
              {isCancelPending ? t("unified_calendar_cancelling") : t("cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
