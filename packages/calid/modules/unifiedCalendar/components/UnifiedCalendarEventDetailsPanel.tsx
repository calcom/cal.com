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
  Pencil,
  Trash2,
  Users,
  Video,
} from "lucide-react";

import { PROVIDER_LABELS } from "../lib/constants";
import type { CalendarEvent, CalendarSource } from "../lib/types";

interface UnifiedCalendarEventDetailsPanelProps {
  event: CalendarEvent;
  calendar: CalendarSource;
  onEdit: () => void;
  onDelete: () => void;
  conflicts: CalendarEvent[];
}

export const UnifiedCalendarEventDetailsPanel = ({
  event,
  calendar,
  onEdit,
  onDelete,
  conflicts,
}: UnifiedCalendarEventDetailsPanelProps) => {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div
          className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full opacity-70"
          style={{ backgroundColor: calendar.color }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-foreground text-base font-semibold">{event.title}</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {calendar.name} · {PROVIDER_LABELS[calendar.provider]}
          </p>
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
            {format(event.start, "h:mm a")} – {format(event.end, "h:mm a")} ·{" "}
            {differenceInMinutes(event.end, event.start)} min
          </span>
        </div>

        {event.location && (
          <div className="text-foreground/80 flex items-center gap-3 text-sm">
            <MapPin className="text-muted-foreground/60 h-3.5 w-3.5 shrink-0" />
            <span>{event.location}</span>
          </div>
        )}

        {event.meetingLink && (
          <div className="flex items-center gap-3 text-sm">
            <Video className="text-muted-foreground/60 h-3.5 w-3.5 shrink-0" />
            <a
              href={event.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="text-primary flex items-center gap-1 text-sm hover:underline">
              Join Meeting <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {event.attendees.length > 0 && (
          <div className="flex items-start gap-3 text-sm">
            <Users className="text-muted-foreground/60 mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="flex flex-wrap gap-1">
              {event.attendees.map((attendee, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-muted/60 text-muted-foreground text-[11px] font-normal">
                  {attendee}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {event.description && <p className="text-muted-foreground/80 pl-7 text-sm">{event.description}</p>}
      </div>

      <Separator className="bg-border/40" />

      <div className="flex items-center gap-2">
        <Button color="secondary" size="sm" className="border-border/60 h-8 gap-1.5 text-xs" onClick={onEdit}>
          <Pencil className="h-3 w-3" /> Edit
        </Button>

        <Button
          color="minimal"
          size="sm"
          className="text-destructive/70 hover:text-destructive border-border/60 h-8 gap-1.5 text-xs"
          onClick={onDelete}>
          <Trash2 className="h-3 w-3" /> Cancel
        </Button>

        {event.meetingLink && (
          <Button
            className="ml-auto h-8 gap-1.5 text-xs"
            href={event.meetingLink}
            target="_blank"
            rel="noreferrer">
            <Video className="h-3 w-3" /> Join
          </Button>
        )}
      </div>
    </div>
  );
};
