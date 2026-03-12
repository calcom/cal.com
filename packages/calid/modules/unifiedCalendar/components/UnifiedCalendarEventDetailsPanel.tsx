import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import { Separator } from "@calid/features/ui/components/separator";
import { differenceInMinutes, format } from "date-fns";
import DOMPurify from "dompurify";
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

import type { UnifiedCalendarEventVM } from "../lib/types";

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
  const statusLabel = event.status.charAt(0) + event.status.slice(1).toLowerCase();
  const attendeeEmails = event.attendees ?? [];
  const providerLabel = event.provider ? (event.provider === "google" ? "Google" : "Outlook") : event.source;
  const calendarLabel = event.calendarName?.trim() || "Calendar";
  const subtitleLabel = event.source === "EXTERNAL" ? `${providerLabel} · ${calendarLabel}` : calendarLabel;
  const description = event.description?.trim();
  const descriptionHasHtml = Boolean(description && /<\/?[a-z][\s\S]*>/i.test(description));
  const sanitizedDescriptionHtml = descriptionHasHtml && description ? DOMPurify.sanitize(description) : null;

  return (
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
          <span>Overlaps with {conflicts.map((conflict) => conflict.title).join(", ")}</span>
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
              ? "All-day"
              : `${format(event.start, "h:mm a")} – ${format(event.end, "h:mm a")} · ${differenceInMinutes(
                  event.end,
                  event.start
                )} min`}
          </span>
        </div>

        {event.location && (
          <div className="text-foreground/80 flex items-center gap-3 text-sm">
            <MapPin className="text-muted-foreground/60 h-3.5 w-3.5 shrink-0" />
            <span>{event.location}</span>
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
              Join Meeting <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {(event.attendeeCount && event.attendeeCount > 0) || attendeeEmails.length > 0 ? (
          <div className="flex items-start gap-3 text-sm">
            <Users className="text-muted-foreground/60 mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="space-y-2">
              <span className="text-muted-foreground/80">
                {attendeeEmails.length > 0 ? attendeeEmails.length : event.attendeeCount} attendees
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
            <RefreshCcw className="h-3 w-3" /> {isReschedulePending ? "Saving..." : "Reschedule"}
          </Button>
        )}

        {event.canDelete && (
          <Button
            color="minimal"
            size="sm"
            className="text-destructive/70 hover:text-destructive border-border/60 h-8 gap-1.5 text-xs"
            onClick={onCancel}
            disabled={isCancelPending || isReschedulePending}>
            <Trash2 className="h-3 w-3" /> {isCancelPending ? "Cancelling..." : "Cancel Booking"}
          </Button>
        )}

        {event.isReadOnly && (
          <p className="text-muted-foreground/70 text-xs">This event is managed in the external calendar.</p>
        )}

        {event.meetingUrl && (
          <Button
            className="ml-auto h-8 gap-1.5 text-xs"
            href={event.meetingUrl}
            target="_blank"
            rel="noreferrer">
            <Video className="h-3 w-3" /> Join
          </Button>
        )}
      </div>
    </div>
  );
};
