import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
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

import { PROVIDER_LABELS } from "../lib/constants";
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

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div
          className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full opacity-70"
          style={{ backgroundColor: event.color }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-foreground text-base font-semibold">{event.title}</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {event.calendarName || "Calendar"} ·{" "}
            {event.provider ? PROVIDER_LABELS[event.provider] : event.source}
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

        {event.attendeeCount && event.attendeeCount > 0 && (
          <div className="flex items-start gap-3 text-sm">
            <Users className="text-muted-foreground/60 mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="text-muted-foreground/80">{event.attendeeCount} attendees</span>
          </div>
        )}

        {event.description && <p className="text-muted-foreground/80 pl-7 text-sm">{event.description}</p>}
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
