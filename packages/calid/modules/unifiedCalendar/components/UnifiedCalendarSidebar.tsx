import { cn } from "@calid/features/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { Input } from "@calid/features/ui/components/input/input";
import { ScrollArea } from "@calid/features/ui/components/scroll-area";
import { Switch } from "@calid/features/ui/components/switch";
import { Search } from "lucide-react";
import { type ChangeEvent, useMemo } from "react";

import { CALENDAR_COLORS, PROVIDER_LABELS } from "../lib/constants";
import type { CalendarSource } from "../lib/types";

interface UnifiedCalendarSidebarProps {
  calendars: CalendarSource[];
  onToggle: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const UnifiedCalendarSidebar = ({
  calendars,
  onToggle,
  onColorChange,
  searchQuery,
  onSearchChange,
}: UnifiedCalendarSidebarProps) => {
  const groupedCalendars = useMemo(() => {
    const providerGroups = new Map<string, CalendarSource[]>();

    calendars.forEach((calendar) => {
      if (!providerGroups.has(calendar.provider)) providerGroups.set(calendar.provider, []);
      providerGroups.get(calendar.provider)?.push(calendar);
    });

    return providerGroups;
  }, [calendars]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-3 pt-4">
        <div className="relative">
          <Search className="text-muted-foreground/60 absolute left-2.5 top-2.5 h-3.5 w-3.5" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onSearchChange(event.target.value)}
            className="bg-muted/40 h-8 border-0 pl-8 text-xs focus-visible:ring-1"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-5 pb-4">
          {Array.from(groupedCalendars.entries()).map(([provider, providerCalendars]) => (
            <div key={provider}>
              <p className="text-muted-foreground/70 mb-2.5 text-[10px] font-semibold uppercase tracking-[0.1em]">
                {PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS]}
              </p>

              <div className="space-y-0.5">
                {providerCalendars.map((calendar) => (
                  <div
                    key={calendar.id}
                    className="hover:bg-muted/50 group flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="shrink-0 focus:outline-none" type="button">
                          <div
                            className="h-2 w-2 rounded-full opacity-70 transition-opacity hover:opacity-100"
                            style={{ backgroundColor: calendar.color }}
                          />
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="start" className="w-auto p-2.5">
                        <p className="text-muted-foreground mb-2 text-[10px] font-medium">Calendar color</p>
                        <div className="flex gap-2">
                          {CALENDAR_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={cn(
                                "h-5 w-5 rounded-full transition-all hover:scale-110",
                                calendar.color === color &&
                                  "ring-foreground/20 ring-offset-background ring-2 ring-offset-2"
                              )}
                              style={{ backgroundColor: color }}
                              onClick={() => onColorChange(calendar.id, color)}
                            />
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <span
                      className={cn(
                        "flex-1 truncate text-[13px] transition-colors",
                        calendar.visible ? "text-foreground" : "text-muted-foreground/50"
                      )}>
                      {calendar.name}
                    </span>

                    <Switch
                      checked={calendar.visible}
                      onCheckedChange={() => onToggle(calendar.id)}
                      className="origin-right scale-[0.65]"
                      aria-label={`Toggle sync for ${calendar.name}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-border/40 border-t px-4 py-3">
        <p className="text-muted-foreground/50 text-center text-[10px]">
          {calendars.filter((calendar) => calendar.visible).length} of {calendars.length} visible
        </p>
      </div>
    </div>
  );
};
