"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import dayjs from "@calcom/dayjs";
import { TimeFormatToggle } from "@calcom/features/bookings/components/TimeFormatToggle";
import { useTimePreferences } from "@calcom/features/bookings/lib/timePreferences";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { SelectedTimeRange } from "@calcom/features/calendars/weeklyview/types/state";
import type { CalendarEvent } from "@calcom/features/calendars/weeklyview/types/events";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { TextField, TextAreaField, Select, Label } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

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

  // User data
  const { data: user } = trpc.viewer.me.get.useQuery();
  const userTimeZone = user?.timeZone ?? timezone;

  // Update week start when user timezone loads
  useEffect(() => {
    if (user?.timeZone) {
      setCurrentWeekStart(dayjs().tz(user.timeZone).startOf("week").toDate());
    }
  }, [user?.timeZone]);

  // Current week end for queries
  const currentWeekEnd = useMemo(
    () => dayjs(currentWeekStart).add(6, "day").endOf("day").toDate(),
    [currentWeekStart]
  );

  // Fetch user's bookings for busy times
  const { data: bookingsData, isPending: isLoadingBookings } = trpc.viewer.bookings.get.useQuery(
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
      let current = dayjs(range.start);
      const end = dayjs(range.end);

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
  const handleWeekChange = useCallback((direction: "prev" | "next") => {
    setCurrentWeekStart((prev) =>
      direction === "prev" ? dayjs(prev).subtract(1, "week").toDate() : dayjs(prev).add(1, "week").toDate()
    );
  }, []);

  const canGoPrev = dayjs(currentWeekStart).isAfter(dayjs().startOf("week"));

  // Handle drag select complete - callback from Calendar component
  const handleDragSelectComplete = useCallback(
    (range: { day: Date; start: Date; end: Date }) => {
      // Don't add ranges in the past
      if (dayjs(range.end).isBefore(dayjs())) {
        showToast(t("cannot_select_past_times") || "Cannot select times in the past", "error");
        return;
      }

      const newRange: SelectedTimeRange = {
        id: generateId(),
        date: dayjs(range.day).format("YYYY-MM-DD"),
        start: range.start,
        end: range.end,
      };

      setSelectedRanges((prev) => [...prev, newRange]);
    },
    [t]
  );

  // Remove a range
  const handleRemoveRange = useCallback((id: string) => {
    setSelectedRanges((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Clear all ranges
  const handleClearAll = useCallback(() => {
    setSelectedRanges([]);
  }, []);

  // Calculate total slots from ranges
  const totalSlots = useMemo(() => {
    return convertRangesToSlots().length;
  }, [convertRangesToSlots]);

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
                    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                    .map((range) => (
                      <div
                        key={range.id}
                        className="bg-subtle flex items-center justify-between rounded-md px-3 py-2 text-sm">
                        <span>
                          {dayjs(range.start).tz(userTimeZone).format("ddd, MMM D")}
                          <br />
                          <span className="text-subtle">
                            {dayjs(range.start).tz(userTimeZone).format(timeFormat)} -{" "}
                            {dayjs(range.end).tz(userTimeZone).format(timeFormat)}
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
          {/* Calendar header with navigation */}
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
              </div>
            </div>
          </div>

          {/* Calendar - using the enhanced shared component */}
          <div className="flex-1 overflow-auto">
            <Calendar
              startDate={currentWeekStart}
              endDate={currentWeekEnd}
              events={busyEvents}
              timezone={userTimeZone}
              startHour={0}
              endHour={23}
              hoverEventDuration={duration}
              hideHeader
              isPending={isLoadingBookings}
              // Enable drag-select functionality
              enableDragSelect
              selectedRanges={selectedRanges}
              onDragSelectComplete={handleDragSelectComplete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
