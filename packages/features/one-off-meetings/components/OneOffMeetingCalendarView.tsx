"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import dayjs from "@calcom/dayjs";
import { TimeFormatToggle } from "@calcom/features/bookings/components/TimeFormatToggle";
import { useTimePreferences } from "@calcom/features/bookings/lib/timePreferences";
import type { CalendarEvent } from "@calcom/features/calendars/weeklyview/types/events";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { TextField, TextAreaField, Select, Label } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

// Types for selected time ranges
export interface SelectedTimeRange {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: Date;
  endTime: Date;
}

interface OneOffMeetingCalendarViewProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const durationOptions = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
  { value: 90, label: "90 minutes" },
  { value: 120, label: "2 hours" },
];

// Helper to generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Helper to get week dates with timezone
function getWeekDates(startDate: Date, numDays: number = 7, tz?: string): dayjs.Dayjs[] {
  const dates: dayjs.Dayjs[] = [];
  // Convert startDate to target timezone and get its date string
  const startInTz = tz ? dayjs(startDate).tz(tz) : dayjs(startDate);
  const startDateStr = startInTz.format("YYYY-MM-DD");

  for (let i = 0; i < numDays; i++) {
    // Create each date at midnight in the target timezone by parsing date string
    const dateStr = dayjs(startDateStr).add(i, "day").format("YYYY-MM-DD");
    const date = tz ? dayjs.tz(`${dateStr} 00:00:00`, tz) : dayjs(dateStr).startOf("day");
    dates.push(date);
  }
  return dates;
}

// Helper to generate hours array
function getHoursArray(startHour: number = 0, endHour: number = 24): number[] {
  const hours: number[] = [];
  for (let h = startHour; h < endHour; h++) {
    hours.push(h);
  }
  return hours;
}

export function OneOffMeetingCalendarView({ onSuccess, onCancel }: OneOffMeetingCalendarViewProps) {
  const { t } = useLocale();
  const router = useRouter();
  const { copyToClipboard } = useCopy();
  const { timeFormat, timezone } = useTimePreferences();
  const utils = trpc.useUtils();

  // Form state
  const [title, setTitle] = useState("One-off meeting");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(30);

  // Calendar state
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    dayjs().tz(timezone).startOf("week").toDate()
  );
  const [selectedRanges, setSelectedRanges] = useState<SelectedTimeRange[]>([]);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: number; hour: number; minute: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: number; hour: number; minute: number } | null>(null);

  // Hover state for preview
  const [hoverPosition, setHoverPosition] = useState<{ day: number; hour: number; minute: number } | null>(
    null
  );

  // Refs
  const calendarRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // User data
  const { data: user } = trpc.viewer.me.get.useQuery();
  const userTimeZone = user?.timeZone ?? timezone;

  // Update week start when user timezone loads
  useEffect(() => {
    if (user?.timeZone) {
      setCurrentWeekStart(dayjs().tz(user.timeZone).startOf("week").toDate());
    }
  }, [user?.timeZone]);

  // Week dates - use userTimeZone for consistency
  const weekDates = useMemo(
    () => getWeekDates(currentWeekStart, 7, userTimeZone),
    [currentWeekStart, userTimeZone]
  );
  const hours = useMemo(() => getHoursArray(0, 24), []);

  // Current week end for queries
  const currentWeekEnd = useMemo(
    () => dayjs(currentWeekStart).add(7, "day").endOf("day").toDate(),
    [currentWeekStart]
  );

  // Fetch user's schedule for working hours
  const { data: schedules } = trpc.viewer.availability.list.useQuery(undefined, {
    staleTime: 60000, // Cache for 1 minute
  });

  // Get the default schedule's working hours
  const workingHours = useMemo(() => {
    if (!schedules?.schedules) return null;

    // Find default schedule or first available
    const defaultSchedule = schedules.schedules.find((s) => s.isDefault) || schedules.schedules[0];
    if (!defaultSchedule?.availability) return null;

    // Build a map of day -> time ranges
    // Days are 0-6 (Sunday-Saturday)
    const hoursMap: Record<number, { start: number; end: number }[]> = {};

    defaultSchedule.availability.forEach((slot) => {
      slot.days.forEach((day) => {
        if (!hoursMap[day]) hoursMap[day] = [];
        hoursMap[day].push({
          start: Math.floor(slot.startTime.getTime() / 60000) % 1440, // Minutes from midnight
          end: Math.floor(slot.endTime.getTime() / 60000) % 1440,
        });
      });
    });

    return hoursMap;
  }, [schedules]);

  // Fetch user's bookings for busy times
  const { data: bookingsData } = trpc.viewer.bookings.get.useQuery(
    {
      filters: {
        status: "upcoming",
        afterStartDate: dayjs(currentWeekStart).toISOString(),
        beforeEndDate: dayjs(currentWeekEnd).toISOString(),
      },
      limit: 100,
      offset: 0,
    },
    { staleTime: 30000 }
  );

  // Convert bookings to calendar events format
  const busyEvents = useMemo<CalendarEvent[]>(() => {
    if (!bookingsData?.bookings) return [];
    return bookingsData.bookings.map((booking, idx) => ({
      id: idx,
      title: booking.title || "Busy",
      start: new Date(booking.startTime),
      end: new Date(booking.endTime),
      options: {
        status: "ACCEPTED" as const,
        color: "#dc2626", // red for busy
      },
    }));
  }, [bookingsData]);

  // Create mutation
  const createMutation = trpc.viewer.oneOffMeetings.create.useMutation({
    onSuccess: (data) => {
      const link = `${window.location.origin}${data.bookingLink}`;
      copyToClipboard(link);
      showToast(t("link_copied_to_clipboard") || "Link copied to clipboard!", "success");
      utils.viewer.oneOffMeetings.list.invalidate();
      onSuccess?.();
      // Redirect to event-types page with single-use links tab
      router.push("/event-types?tab=single-use-links");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  // Convert selected ranges to slots for API
  const convertRangesToSlots = useCallback(() => {
    const slots: { startTime: string; endTime: string }[] = [];

    selectedRanges.forEach((range) => {
      // Generate individual slots from the range based on duration
      let current = dayjs(range.startTime);
      const end = dayjs(range.endTime);

      while (current.isBefore(end)) {
        const slotEnd = current.add(duration, "minute");
        if (slotEnd.isAfter(end)) break;

        slots.push({
          startTime: current.toISOString(),
          endTime: slotEnd.toISOString(),
        });
        current = slotEnd;
      }
    });

    return slots;
  }, [selectedRanges, duration]);

  // Handle create
  const handleCreate = () => {
    const slots = convertRangesToSlots();

    if (slots.length === 0) {
      showToast(t("please_select_time_slots") || "Please select at least one time slot", "error");
      return;
    }

    createMutation.mutate({
      title,
      description: description || undefined,
      duration,
      timeZone: userTimeZone,
      offeredSlots: slots,
    });
  };

  // Navigation
  const handleWeekChange = (direction: "prev" | "next") => {
    setCurrentWeekStart((prev) =>
      direction === "prev" ? dayjs(prev).subtract(1, "week").toDate() : dayjs(prev).add(1, "week").toDate()
    );
  };

  const canGoPrev = dayjs(currentWeekStart).isAfter(dayjs().startOf("week"));

  // Drag handlers
  const getCellFromPosition = useCallback(
    (clientX: number, clientY: number): { day: number; hour: number; minute: number } | null => {
      if (!gridRef.current) return null;

      const rect = gridRef.current.getBoundingClientRect();

      // Calculate relative position within the grid
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Constants for grid calculations
      const timeColumnWidth = 60; // Width of time labels column
      const cellHeight = 60; // Height per hour
      const cellWidth = (rect.width - timeColumnWidth) / 7;

      // Calculate day and time
      const day = Math.floor((x - timeColumnWidth) / cellWidth);
      const totalMinutes = (y / cellHeight) * 60;
      const hour = Math.floor(totalMinutes / 60);
      const minute = Math.floor((totalMinutes % 60) / 15) * 15; // Snap to 15-minute intervals

      if (day < 0 || day > 6 || hour < 0 || hour > 23) return null;

      return { day, hour, minute };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const cell = getCellFromPosition(e.clientX, e.clientY);
      if (!cell) return;

      // Check if clicking on a busy event
      const clickedDate = weekDates[cell.day].hour(cell.hour).minute(cell.minute).tz(userTimeZone);

      const isClickOnBusy = busyEvents.some((event) => {
        const eventStart = dayjs(event.start);
        const eventEnd = dayjs(event.end);
        return clickedDate.isAfter(eventStart) && clickedDate.isBefore(eventEnd);
      });

      // Allow selecting even on busy times (per user request)
      setIsDragging(true);
      setDragStart(cell);
      setDragEnd(cell);
    },
    [getCellFromPosition, weekDates, busyEvents, userTimeZone]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const cell = getCellFromPosition(e.clientX, e.clientY);

      if (isDragging) {
        if (cell) {
          setDragEnd(cell);
        }
      } else {
        // Track hover position for preview
        setHoverPosition(cell);
      }
    },
    [isDragging, getCellFromPosition]
  );

  // Clear hover when mouse leaves the grid
  const handleMouseLeave = useCallback(() => {
    setHoverPosition(null);
    if (isDragging) {
      // Complete the drag if mouse leaves while dragging
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      return;
    }

    // Create the selected range
    const startDay = Math.min(dragStart.day, dragEnd.day);
    const endDay = Math.max(dragStart.day, dragEnd.day);

    // Check if this is a single click (same start and end position)
    const isSingleClick =
      dragStart.day === dragEnd.day && dragStart.hour === dragEnd.hour && dragStart.minute === dragEnd.minute;

    for (let d = startDay; d <= endDay; d++) {
      const startMinutes =
        dragStart.day === d || startDay === endDay
          ? Math.min(dragStart.hour * 60 + dragStart.minute, dragEnd.hour * 60 + dragEnd.minute)
          : dragStart.hour * 60 + dragStart.minute;

      // For single clicks, use the duration; for drags, use the drag end + 15 min buffer
      const endMinutes = isSingleClick
        ? startMinutes + duration
        : dragEnd.day === d || startDay === endDay
        ? Math.max(dragStart.hour * 60 + dragStart.minute, dragEnd.hour * 60 + dragEnd.minute) + 15
        : dragEnd.hour * 60 + dragEnd.minute + 15;

      const dayDate = weekDates[d];
      // Build datetime strings and parse them directly in the target timezone
      // This avoids issues with .hour()/.minute() setters on timezone-aware dayjs
      const dateStr = dayDate.format("YYYY-MM-DD");
      const startHour = Math.floor(startMinutes / 60);
      const startMin = startMinutes % 60;
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;

      const startTimeStr = `${dateStr} ${String(startHour).padStart(2, "0")}:${String(startMin).padStart(
        2,
        "0"
      )}:00`;
      const endTimeStr = `${dateStr} ${String(endHour).padStart(2, "0")}:${String(endMin).padStart(
        2,
        "0"
      )}:00`;

      const startTime = dayjs.tz(startTimeStr, userTimeZone).toDate();
      const endTime = dayjs.tz(endTimeStr, userTimeZone).toDate();

      // Don't add ranges in the past
      if (dayjs(endTime).isBefore(dayjs())) {
        continue;
      }

      const newRange: SelectedTimeRange = {
        id: generateId(),
        date: dayDate.tz(userTimeZone).format("YYYY-MM-DD"),
        startTime,
        endTime,
      };

      setSelectedRanges((prev) => [...prev, newRange]);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, weekDates, userTimeZone, duration]);

  // Handle single click on cell
  const handleCellClick = useCallback(
    (day: number, hour: number, minute: number = 0) => {
      const dayDate = weekDates[day];
      // Build datetime string and parse directly in target timezone
      const dateStr = dayDate.format("YYYY-MM-DD");
      const startTimeStr = `${dateStr} ${String(hour).padStart(2, "0")}:${String(minute).padStart(
        2,
        "0"
      )}:00`;
      const startTime = dayjs.tz(startTimeStr, userTimeZone).toDate();
      const endTime = dayjs.tz(startTimeStr, userTimeZone).add(duration, "minute").toDate();

      // Don't add slots in the past
      if (dayjs(endTime).isBefore(dayjs())) {
        showToast(t("cannot_select_past_times") || "Cannot select times in the past", "error");
        return;
      }

      const newRange: SelectedTimeRange = {
        id: generateId(),
        date: dateStr,
        startTime,
        endTime,
      };

      setSelectedRanges((prev) => [...prev, newRange]);
    },
    [weekDates, userTimeZone, duration, t]
  );

  // Remove a range
  const handleRemoveRange = useCallback((id: string) => {
    setSelectedRanges((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Clear all ranges
  const handleClearAll = useCallback(() => {
    setSelectedRanges([]);
  }, []);

  // Get drag selection overlay style
  const getDragOverlayStyle = useCallback(() => {
    if (!isDragging || !dragStart || !dragEnd || !gridRef.current) return null;

    const timeColumnWidth = 60;
    const cellHeight = 60;
    const rect = gridRef.current.getBoundingClientRect();
    const cellWidth = (rect.width - timeColumnWidth) / 7;

    const startDay = Math.min(dragStart.day, dragEnd.day);
    const endDay = Math.max(dragStart.day, dragEnd.day);
    const startMinutes = Math.min(dragStart.hour * 60 + dragStart.minute, dragEnd.hour * 60 + dragEnd.minute);
    const endMinutes =
      Math.max(dragStart.hour * 60 + dragStart.minute, dragEnd.hour * 60 + dragEnd.minute) + 15;

    const left = timeColumnWidth + startDay * cellWidth;
    const width = (endDay - startDay + 1) * cellWidth;
    const top = (startMinutes / 60) * cellHeight;
    const height = ((endMinutes - startMinutes) / 60) * cellHeight;

    return {
      left: `${left}px`,
      width: `${width}px`,
      top: `${top}px`,
      height: `${height}px`,
    };
  }, [isDragging, dragStart, dragEnd]);

  // Get hover preview style based on selected duration
  const getHoverPreviewStyle = useCallback(() => {
    if (!hoverPosition || isDragging || !gridRef.current) return null;

    // Check if hovered position is in the past
    const dayDate = weekDates[hoverPosition.day];
    if (!dayDate) return null;

    const dateStr = dayDate.format("YYYY-MM-DD");
    const hoverTimeStr = `${dateStr} ${String(hoverPosition.hour).padStart(2, "0")}:${String(
      hoverPosition.minute
    ).padStart(2, "0")}:00`;
    const hoverTime = dayjs.tz(hoverTimeStr, userTimeZone);

    if (hoverTime.isBefore(dayjs())) return null;

    const timeColumnWidth = 60;
    const cellHeight = 60;
    const rect = gridRef.current.getBoundingClientRect();
    const cellWidth = (rect.width - timeColumnWidth) / 7;

    const startMinutes = hoverPosition.hour * 60 + hoverPosition.minute;
    const endMinutes = startMinutes + duration;

    const left = timeColumnWidth + hoverPosition.day * cellWidth;
    const width = cellWidth;
    const top = (startMinutes / 60) * cellHeight;
    const height = (duration / 60) * cellHeight;

    return {
      left: `${left}px`,
      width: `${width}px`,
      top: `${top}px`,
      height: `${height}px`,
    };
  }, [hoverPosition, isDragging, weekDates, userTimeZone, duration]);

  // Check if a cell has a busy event
  const isCellBusy = useCallback(
    (day: number, hour: number, minute: number = 0): boolean => {
      const dayDate = weekDates[day];
      if (!dayDate) return false;

      // Build datetime string and parse in target timezone
      const dateStr = dayDate.format("YYYY-MM-DD");
      const timeStr = `${dateStr} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
      const cellTime = dayjs.tz(timeStr, userTimeZone);

      return busyEvents.some((event) => {
        const eventStart = dayjs(event.start).tz(userTimeZone);
        const eventEnd = dayjs(event.end).tz(userTimeZone);
        return cellTime.isSame(eventStart) || (cellTime.isAfter(eventStart) && cellTime.isBefore(eventEnd));
      });
    },
    [weekDates, busyEvents, userTimeZone]
  );

  // Check if cell is in the past
  const isCellPast = useCallback(
    (day: number, hour: number, minute: number = 0): boolean => {
      const dayDate = weekDates[day];
      if (!dayDate) return true;

      // Build datetime string and parse in target timezone
      const dateStr = dayDate.format("YYYY-MM-DD");
      const timeStr = `${dateStr} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
      const cellTime = dayjs.tz(timeStr, userTimeZone);
      return cellTime.isBefore(dayjs());
    },
    [weekDates, userTimeZone]
  );

  // Check if cell is within working hours
  const isCellInWorkingHours = useCallback(
    (day: number, hour: number, minute: number = 0): boolean => {
      if (!workingHours) return true; // If no schedule, consider all hours as working hours

      const dayOfWeek = weekDates[day].day(); // 0-6, Sunday-Saturday
      const dayHours = workingHours[dayOfWeek];

      if (!dayHours || dayHours.length === 0) return false;

      const minuteOfDay = hour * 60 + minute;

      return dayHours.some((range) => minuteOfDay >= range.start && minuteOfDay < range.end);
    },
    [weekDates, workingHours]
  );

  // Format time for display
  const formatTime = (hour: number, minute: number = 0) => {
    return dayjs().hour(hour).minute(minute).format(timeFormat);
  };

  // Calculate total slots from ranges
  const totalSlots = useMemo(() => {
    return convertRangesToSlots().length;
  }, [convertRangesToSlots]);

  // Reset to create another meeting
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-subtle flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            color="minimal"
            onClick={() => {
              window.close();
              // Fallback if window.close() doesn't work (e.g., direct navigation)
              setTimeout(() => onCancel?.(), 100);
            }}
            StartIcon="x">
            {t("close")}
          </Button>
          <h1 className="text-emphasis text-lg font-semibold">{t("create_one_off_meeting")}</h1>
        </div>
        <Button
          onClick={handleCreate}
          disabled={selectedRanges.length === 0 || !title.trim()}
          loading={createMutation.isPending}>
          <Icon name="link" className="mr-2 h-4 w-4" />
          {t("create_link")}
        </Button>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1">
        {/* Left sidebar - Form */}
        <div className="border-subtle w-80 flex-shrink-0 overflow-y-auto border-r p-6">
          <div className="space-y-5">
            <TextField
              name="title"
              label={t("title")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("one_off_meeting")}
            />

            <div>
              <Label>{t("duration")}</Label>
              <Select
                options={durationOptions}
                value={durationOptions.find((opt) => opt.value === duration)}
                onChange={(option) => option && setDuration(option.value)}
                menuPlacement="bottom"
              />
            </div>

            <TextAreaField
              name="description"
              label={t("description")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("optional")}
              rows={3}
            />

            <div className="text-subtle text-sm">
              <Icon name="globe" className="mr-1 inline h-4 w-4" />
              {t("timezone")}: {userTimeZone}
            </div>

            {/* Selected slots summary */}
            <div className="border-subtle rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-emphasis text-sm font-medium">
                  {t("selected_slots")}: {totalSlots}
                </span>
                {selectedRanges.length > 0 && (
                  <Button color="destructive" variant="icon" size="sm" onClick={handleClearAll}>
                    <Icon name="trash" className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {selectedRanges.length > 0 ? (
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {selectedRanges
                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                    .map((range) => (
                      <div
                        key={range.id}
                        className="bg-subtle flex items-center justify-between rounded-md px-3 py-2 text-sm">
                        <span>
                          {dayjs(range.startTime).tz(userTimeZone).format("ddd, MMM D")}
                          <br />
                          <span className="text-subtle">
                            {dayjs(range.startTime).tz(userTimeZone).format(timeFormat)} -{" "}
                            {dayjs(range.endTime).tz(userTimeZone).format(timeFormat)}
                          </span>
                        </span>
                        <Button
                          color="minimal"
                          variant="icon"
                          size="sm"
                          onClick={() => handleRemoveRange(range.id)}>
                          <Icon name="x" className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-muted text-center text-sm">
                  {t("drag_to_select_times") || "Drag on the calendar to select available times"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Calendar */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Calendar header */}
          <div className="border-subtle flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Button
                color="minimal"
                size="sm"
                onClick={() => handleWeekChange("prev")}
                disabled={!canGoPrev}
                StartIcon="chevron-left"
              />
              <span className="text-emphasis min-w-48 text-center text-sm font-medium">
                {dayjs(currentWeekStart).format("MMM D")} -{" "}
                {dayjs(currentWeekStart).add(6, "day").format("MMM D, YYYY")}
              </span>
              <Button
                color="minimal"
                size="sm"
                onClick={() => handleWeekChange("next")}
                StartIcon="chevron-right"
              />
            </div>
            <div className="flex items-center gap-4">
              <TimeFormatToggle />
              <div className="text-subtle flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-red-200" />
                  {t("busy")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="bg-brand-default h-3 w-3 rounded" />
                  {t("selected")}
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="h-3 w-3 rounded bg-gray-100"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)",
                    }}
                  />
                  {t("outside_working_hours") || "Outside working hours"}
                </span>
              </div>
            </div>
          </div>

          {/* Calendar grid */}
          <div ref={calendarRef} className="relative flex-1 select-none overflow-auto">
            {/* Day headers */}
            <div className="bg-default sticky top-0 z-20 flex" style={{ paddingLeft: "60px" }}>
              {weekDates.map((day, idx) => {
                const isToday = day.isSame(dayjs(), "day");
                return (
                  <div
                    key={idx}
                    className={classNames(
                      "border-subtle flex-1 border-b border-l py-3 text-center text-sm",
                      isToday && "bg-emphasis"
                    )}>
                    <div
                      className={classNames("font-medium", isToday ? "text-brand-default" : "text-emphasis")}>
                      {day.format("ddd")}
                    </div>
                    <div className={classNames("text-xs", isToday ? "text-brand-default" : "text-subtle")}>
                      {day.format("MMM D")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div
              ref={gridRef}
              className="relative"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}>
              {hours.map((hour) => (
                <div key={hour} className="flex" style={{ height: "60px" }}>
                  {/* Time label */}
                  <div className="text-subtle w-[60px] flex-shrink-0 pr-2 pt-0 text-right text-xs">
                    {formatTime(hour)}
                  </div>
                  {/* Day cells */}
                  {weekDates.map((_, dayIdx) => {
                    const isPast = isCellPast(dayIdx, hour);
                    const isBusy = isCellBusy(dayIdx, hour);
                    const isWorkingHours = isCellInWorkingHours(dayIdx, hour);
                    // Note: Cell selection highlighting removed - we use overlay boxes for precise display

                    return (
                      <div
                        key={dayIdx}
                        className={classNames(
                          "border-subtle relative flex-1 cursor-pointer border-b border-l transition-colors",
                          isPast && "cursor-not-allowed bg-gray-100 dark:bg-gray-800",
                          !isPast && !isWorkingHours && "bg-gray-50 dark:bg-gray-900/50",
                          isBusy && !isPast && "bg-red-50 dark:bg-red-900/20"
                        )}
                        style={
                          !isPast && !isWorkingHours
                            ? {
                                backgroundImage:
                                  "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 8px)",
                              }
                            : undefined
                        }>
                        {/* Busy event indicator */}
                        {isBusy && !isPast && (
                          <div className="absolute inset-1 flex items-center justify-center">
                            <span className="text-xs text-red-600 opacity-60">{t("busy")}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Drag selection overlay */}
              {isDragging && dragStart && dragEnd && (
                <div
                  className="bg-brand-default/40 border-brand-default pointer-events-none absolute z-30 rounded border-2"
                  style={getDragOverlayStyle() || undefined}
                />
              )}

              {/* Hover preview overlay - shows duration-based preview */}
              {!isDragging && hoverPosition && getHoverPreviewStyle() && (
                <div
                  className="pointer-events-none absolute z-20 rounded border-2 border-dashed border-gray-400 bg-gray-200/50"
                  style={getHoverPreviewStyle() || undefined}
                />
              )}

              {/* Selected ranges overlay */}
              {selectedRanges.map((range) => {
                // Convert to user's timezone for display
                const rangeStart = dayjs(range.startTime).tz(userTimeZone);
                const rangeEnd = dayjs(range.endTime).tz(userTimeZone);
                // Match using timezone-aware date formatting
                const dayIdx = weekDates.findIndex((d) => d.format("YYYY-MM-DD") === range.date);
                if (dayIdx === -1) return null;

                // Now these are already in user's timezone
                const startHour = rangeStart.hour();
                const startMinute = rangeStart.minute();
                const endHour = rangeEnd.hour();
                const endMinute = rangeEnd.minute();

                const top = (startHour + startMinute / 60) * 60;
                const height = ((endHour - startHour) * 60 + (endMinute - startMinute)) * (60 / 60);
                const left = 60 + (dayIdx * ((gridRef.current?.clientWidth || 800) - 60)) / 7;
                const width = ((gridRef.current?.clientWidth || 800) - 60) / 7 - 2;

                return (
                  <div
                    key={range.id}
                    className="bg-brand-default/60 border-brand-default group absolute z-10 cursor-pointer rounded border"
                    style={{
                      top: `${top}px`,
                      left: `${left}px`,
                      height: `${height}px`,
                      width: `${width}px`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveRange(range.id);
                    }}>
                    <div className="text-brand p-1 text-xs font-medium">
                      {rangeStart.format(timeFormat)} - {rangeEnd.format(timeFormat)}
                    </div>
                    <div className="absolute right-1 top-1 hidden group-hover:block">
                      <Icon name="x" className="text-brand h-3 w-3" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
