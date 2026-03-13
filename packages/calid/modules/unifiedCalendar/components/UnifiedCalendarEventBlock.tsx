import { cn } from "@calid/features/lib/cn";
import { Button } from "@calid/features/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@calid/features/ui/components/popover";
import { Separator } from "@calid/features/ui/components/separator";
import { Tooltip } from "@calid/features/ui/components/tooltip";
import { format } from "date-fns";
import { AlertTriangle, Video } from "lucide-react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

import { PROVIDER_LABELS } from "../lib/constants";
import type { UnifiedCalendarEventVM } from "../lib/types";

interface UnifiedCalendarEventBlockProps {
  event: UnifiedCalendarEventVM;
  style: CSSProperties;
  onClick: () => void;
  isConflict: boolean;
  isDragEnabled?: boolean;
  isDragging?: boolean;
  isRescheduling?: boolean;
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

export const UnifiedCalendarEventBlock = ({
  event,
  style,
  onClick,
  isConflict,
  isDragEnabled = false,
  isDragging = false,
  isRescheduling = false,
  onPointerDown,
}: UnifiedCalendarEventBlockProps) => {
  const providerLabel = event.provider ? PROVIDER_LABELS[event.provider] : event.source;
  const statusLabel = event.status === "CONFIRMED" ? "" : event.status.toLowerCase();
  const hasCapabilityActions = event.canReschedule || event.canDelete;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-grabbed={isDragging}
          onPointerDown={onPointerDown}
          onClick={onClick}
          className={cn(
            "absolute cursor-pointer overflow-hidden rounded-[6px] px-2.5 py-1.5 text-left",
            "bg-background border-border/60 border shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]",
            "hover:border-border transition-all duration-150 hover:shadow-[0_2px_8px_0_rgba(0,0,0,0.08)]",
            "group border-l-[3px]",
            isDragEnabled && "cursor-grab active:cursor-grabbing",
            event.status === "CANCELLED" && "opacity-65",
            isDragging && "ring-border opacity-45 ring-1",
            isRescheduling && "cursor-progress opacity-70"
          )}
          style={{
            ...style,
            borderLeftColor: isConflict ? "hsl(0, 65%, 55%)" : event.color,
          }}>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "text-foreground truncate text-[11px] font-medium leading-tight",
                event.status === "CANCELLED" && "line-through"
              )}>
              {event.title}
            </span>
            {isConflict && (
              <Tooltip content="Conflict with another event">
                <AlertTriangle className="text-destructive/70 h-2.5 w-2.5 shrink-0" />
              </Tooltip>
            )}
          </div>

          <p className="text-muted-foreground/70 mt-0.5 text-[10px] leading-tight">
            {event.isAllDay ? "All-day" : `${format(event.start, "h:mm")} – ${format(event.end, "h:mm a")}`}
          </p>
          <p className="text-muted-foreground/50 mt-0.5 text-[9px] leading-tight">
            {providerLabel}
            {statusLabel ? ` · ${statusLabel}` : ""}
            {isRescheduling ? " · saving..." : ""}
          </p>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="start"
        className="border-border/60 w-56 rounded-lg border p-0 shadow-lg"
        onOpenAutoFocus={(event) => event.preventDefault()}>
        <div className="space-y-2.5 p-3">
          <div>
            <p className="text-foreground text-sm font-medium">{event.title}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {event.isAllDay
                ? "All-day"
                : `${format(event.start, "h:mm a")} – ${format(event.end, "h:mm a")}`}
            </p>
            <p className="text-muted-foreground/60 mt-0.5 text-[11px]">
              {event.calendarName || "Calendar"} · {providerLabel}
            </p>
          </div>

          {isConflict && (
            <div className="text-destructive/80 bg-destructive/5 flex items-center gap-1.5 rounded px-2 py-1 text-[11px]">
              <AlertTriangle className="h-3 w-3" />
              <span>Scheduling conflict</span>
            </div>
          )}

          <Separator className="bg-border/40" />

          <div className="flex items-center gap-1.5">
            {hasCapabilityActions && (
              <Button
                color="minimal"
                size="sm"
                className="text-muted-foreground hover:text-foreground h-7 gap-1 px-2 text-xs"
                onClick={onClick}>
                Manage booking
              </Button>
            )}

            {event.meetingUrl && (
              <Button
                color="minimal"
                size="sm"
                className="text-muted-foreground hover:text-foreground h-7 gap-1 px-2 text-xs"
                href={event.meetingUrl}
                target="_blank"
                rel="noreferrer">
                <Video className="h-3 w-3" /> Join
              </Button>
            )}

            {!hasCapabilityActions && event.isReadOnly && !event.meetingUrl && (
              <p className="text-muted-foreground/60 px-1 text-[11px]">Read-only event</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
