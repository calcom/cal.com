import { cn } from "@calid/features/lib/cn";
import { Button } from "@calid/features/ui/components/button";
import { Separator } from "@calid/features/ui/components/separator";
import { ChevronLeft, ChevronRight, PanelLeft, PanelLeftClose, Plus } from "lucide-react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

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
  isMobile,
}: UnifiedCalendarToolbarProps) => {
  const { t } = useLocale();

  return (
    <div className="bg-default sticky top-0 z-30 flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-2 backdrop-blur-sm">
      <div className="flex  flex-1 items-center gap-2 sm:flex-none" id="info">
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
          {t("today_capitalized")}
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

        <span className="text-foreground/80 truncate whitespace-nowrap text-sm font-medium">
          {headerTitle}
        </span>
      </div>

      <div
        className="flex w-full items-center justify-between gap-2 sm:ml-auto sm:w-auto sm:flex-none"
        id="toggleView">
        <div className="flex w-full rounded-lg border p-0.5 shadow-inner">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              className={cn(
                "w-full rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all",
                viewMode === mode
                  ? "bg-default text-foreground border-border/40 border shadow-sm"
                  : "text-muted-foreground/70 hover:bg-default/60 hover:text-foreground"
              )}
              onClick={() => onChangeViewMode(mode)}>
              {t(`unified_calendar_view_${mode}`)}
            </button>
          ))}
        </div>

        {!isMobile && (
          <Button
            color="secondary"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            href="/apps?category=calendar">
            <Plus className="h-3.5 w-3.5" />
            {t("add_calendar")}
          </Button>
        )}
      </div>
    </div>
  );
};
