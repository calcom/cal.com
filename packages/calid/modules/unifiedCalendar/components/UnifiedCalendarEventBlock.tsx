import { cn } from "@calid/features/lib/cn";
import { Popover, PopoverTrigger } from "@calid/features/ui/components/popover";
import { Tooltip } from "@calid/features/ui/components/tooltip";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

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
  const { t } = useLocale();
  const providerLabel = event.provider
    ? t(`unified_calendar_provider_label_${event.provider}`)
    : event.source;
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
            "bg-default border-border/60 border shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]",
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
              <Tooltip content={t("unified_calendar_conflict_with_another_event")}>
                <AlertTriangle className="text-destructive/70 h-2.5 w-2.5 shrink-0" />
              </Tooltip>
            )}
          </div>

          <p className="text-muted-foreground/70 mt-0.5 text-[10px] leading-tight">
            {event.isAllDay
              ? t("unified_calendar_all_day")
              : `${format(event.start, "h:mm")} – ${format(event.end, "h:mm a")}`}
          </p>
          <p className="text-muted-foreground/50 mt-0.5 text-[9px] leading-tight">
            {providerLabel}
            {statusLabel ? ` · ${statusLabel}` : ""}
            {isRescheduling ? ` · ${t("unified_calendar_saving_lowercase")}` : ""}
          </p>
        </button>
      </PopoverTrigger>
    </Popover>
  );
};
