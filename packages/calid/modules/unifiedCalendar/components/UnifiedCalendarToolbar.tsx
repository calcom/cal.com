import { cn } from "@calid/features/lib/cn";
import { Button } from "@calid/features/ui/components/button";
import { Separator } from "@calid/features/ui/components/separator";
import { ChevronLeft, ChevronRight, Globe, PanelLeft, PanelLeftClose, Plus } from "lucide-react";

import { TIMEZONES } from "../lib/constants";
import type { ViewMode } from "../lib/types";

interface UnifiedCalendarToolbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  headerTitle: string;
  viewMode: ViewMode;
  onChangeViewMode: (viewMode: ViewMode) => void;
  timezone: string;
  onChangeTimezone: (timezone: string) => void;
  isMobile: boolean;
}

export const UnifiedCalendarToolbar = ({
  sidebarOpen,
  onToggleSidebar,
  onToday,
  onPrev,
  onNext,
  headerTitle,
  viewMode,
  onChangeViewMode,
  timezone,
  onChangeTimezone,
  isMobile,
}: UnifiedCalendarToolbarProps) => {
  return (
    <div className="bg-background/95 border-border/30 sticky top-0 z-30 border-b backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2">
        <Button
          variant="icon"
          color="minimal"
          size="sm"
          className="text-muted-foreground/60 hover:text-foreground h-8 w-8"
          onClick={onToggleSidebar}>
          {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </Button>

        <Separator orientation="vertical" className="bg-border/30 mx-0.5 h-4" />

        <Button
          color="minimal"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-7 rounded-md px-2.5 text-xs"
          onClick={onToday}>
          Today
        </Button>

        <div className="flex items-center">
          <Button
            variant="icon"
            color="minimal"
            size="sm"
            className="text-muted-foreground/50 hover:text-foreground h-7 w-7"
            onClick={onPrev}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="icon"
            color="minimal"
            size="sm"
            className="text-muted-foreground/50 hover:text-foreground h-7 w-7"
            onClick={onNext}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <span className="text-foreground/80 whitespace-nowrap text-sm font-medium">{headerTitle}</span>

        <div className="ml-auto flex items-center gap-2">
          <div className="bg-muted/30 border-border/20 flex rounded-md border p-0.5">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn(
                  "rounded-[4px] px-2.5 py-1 text-[11px] font-medium capitalize transition-all",
                  viewMode === mode
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground/60 hover:text-foreground/80"
                )}
                onClick={() => onChangeViewMode(mode)}>
                {mode}
              </button>
            ))}
          </div>

          {!isMobile && (
            <div className="border-border/30 text-muted-foreground/70 flex h-7 items-center gap-1 rounded-md border bg-transparent px-2 text-[11px]">
              <Globe className="h-3 w-3" />
              <select
                value={timezone}
                onChange={(event) => onChangeTimezone(event.target.value)}
                className="bg-transparent text-[11px] outline-none">
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            color="minimal"
            size="sm"
            className="text-muted-foreground/70 hover:text-foreground border-border/30 h-7 gap-1 rounded-md border px-2.5 text-[11px]">
            <Plus className="h-3 w-3" /> Add Calendar
          </Button>
        </div>
      </div>
    </div>
  );
};
