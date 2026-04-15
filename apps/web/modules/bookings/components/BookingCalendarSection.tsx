"use client";

import dayjs from "@calcom/dayjs";
import { weekdayToWeekIndex } from "@calcom/lib/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { ToggleGroup } from "@calcom/ui/components/form";
import { ChevronLeftIcon, ChevronRightIcon } from "@coss/ui/icons";
import { useEffect, useMemo, useState } from "react";
import { useBookingFilters } from "~/bookings/hooks/useBookingFilters";
import { useCalendarViewToggle } from "~/bookings/hooks/useCalendarViewToggle";
import { getWeekStart } from "../lib/weekUtils";
import { BookingDetailsSheetStoreProvider } from "../store/bookingDetailsSheetStore";
import type { BookingListingStatus, BookingsGetOutput } from "../types";
import { BookingCalendarView } from "./BookingCalendarView";
import { BookingDetailsSheet } from "./BookingDetailsSheet";
import { BookingMonthView } from "./BookingMonthView";

// Show all non-cancelled statuses so the calendar is a complete picture of the user's schedule
const ALL_CALENDAR_STATUSES: BookingListingStatus[] = ["upcoming", "unconfirmed", "recurring", "past"];

interface BookingCalendarSectionProps {
  bookingAuditEnabled: boolean;
}

interface BookingCalendarSectionInnerProps {
  bookings: BookingsGetOutput["bookings"];
  calView: "week" | "month";
  setCalView: (v: "week" | "month") => void;
  referenceDate: dayjs.Dayjs;
  setReferenceDate: (d: dayjs.Dayjs) => void;
  userWeekStart: number;
  bookingAuditEnabled: boolean;
}

function BookingCalendarSectionInner({
  bookings,
  calView,
  setCalView,
  referenceDate,
  setReferenceDate,
  userWeekStart,
  bookingAuditEnabled,
}: BookingCalendarSectionInnerProps) {
  const { t } = useLocale();
  const user = useMeQuery().data;

  const currentWeekStart = getWeekStart(referenceDate, userWeekStart);
  const currentMonth = referenceDate.startOf("month");

  let headerLabel: string;
  if (calView === "week") {
    const weekEnd = currentWeekStart.add(6, "day");
    headerLabel =
      currentWeekStart.month() === weekEnd.month()
        ? `${currentWeekStart.format("MMM D")} – ${weekEnd.format("D, YYYY")}`
        : `${currentWeekStart.format("MMM D")} – ${weekEnd.format("MMM D, YYYY")}`;
  } else {
    headerLabel = currentMonth.format("MMMM YYYY");
  }

  const goBack = () => {
    if (calView === "week") {
      setReferenceDate(referenceDate.subtract(1, "week"));
    } else {
      setReferenceDate(referenceDate.subtract(1, "month").startOf("month"));
    }
  };

  const goForward = () => {
    if (calView === "week") {
      setReferenceDate(referenceDate.add(1, "week"));
    } else {
      setReferenceDate(referenceDate.add(1, "month").startOf("month"));
    }
  };

  const goToToday = () => setReferenceDate(dayjs());

  return (
    <div className="mt-6">
      {/* Controls row */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emphasis text-sm">{headerLabel}</span>
          <Button color="secondary" size="sm" onClick={goToToday} className="capitalize">
            {t("today")}
          </Button>
          <ButtonGroup combined>
            <Button
              color="secondary"
              size="sm"
              onClick={goBack}
              aria-label={calView === "week" ? t("view_previous_week") : t("view_previous_month")}>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              color="secondary"
              size="sm"
              onClick={goForward}
              aria-label={calView === "week" ? t("view_next_week") : t("view_next_month")}>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </ButtonGroup>
        </div>

        <ToggleGroup
          value={calView}
          onValueChange={(value: "week" | "month") => {
            if (!value) return;
            setCalView(value);
          }}
          options={[
            { value: "week", label: t("week_view") },
            { value: "month", label: t("month_view") },
          ]}
        />
      </div>

      {/* Calendar body */}
      {calView === "week" ? (
        <BookingCalendarView
          bookings={bookings}
          currentWeekStart={currentWeekStart}
          onWeekStartChange={(weekStart) => setReferenceDate(weekStart)}
          startHour={6}
          endHour={23}
          containerStyle={{ height: "800px" }}
        />
      ) : (
        <BookingMonthView bookings={bookings} currentMonth={currentMonth} userWeekStart={userWeekStart} />
      )}

      <BookingDetailsSheet
        userTimeZone={user?.timeZone}
        userTimeFormat={user?.timeFormat === null ? undefined : user?.timeFormat}
        userId={user?.id}
        userEmail={user?.email}
        bookingAuditEnabled={bookingAuditEnabled}
      />
    </div>
  );
}

export function BookingCalendarSection({ bookingAuditEnabled }: BookingCalendarSectionProps) {
  const { userIds } = useBookingFilters();
  const user = useMeQuery().data;
  const userWeekStart = weekdayToWeekIndex(user?.weekStart);

  const [calView, setCalView] = useCalendarViewToggle();

  // Single reference date drives both the query date range and the inner UI navigation.
  // Lifting it here ensures navigating months/weeks always re-fetches the correct data.
  const [referenceDate, setReferenceDate] = useState(dayjs());

  const currentWeekStart = getWeekStart(referenceDate, userWeekStart);
  const currentMonth = referenceDate.startOf("month");

  const afterStartDate =
    calView === "week"
      ? currentWeekStart.startOf("day").toISOString()
      : currentMonth.startOf("day").toISOString();

  const beforeEndDate =
    calView === "week"
      ? currentWeekStart.add(6, "day").endOf("day").toISOString()
      : currentMonth.endOf("month").endOf("day").toISOString();

  const query = trpc.viewer.bookings.get.useInfiniteQuery(
    {
      limit: 100,
      filters: {
        statuses: ALL_CALENDAR_STATUSES,
        userIds,
        afterStartDate,
        beforeEndDate,
      },
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    }
  );

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  // Auto-fetch all pages so the calendar always shows complete data for the period
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const bookings = useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((page) => page.bookings);
  }, [query.data?.pages]);

  return (
    <BookingDetailsSheetStoreProvider bookings={bookings}>
      <BookingCalendarSectionInner
        bookings={bookings}
        calView={calView}
        setCalView={setCalView}
        referenceDate={referenceDate}
        setReferenceDate={setReferenceDate}
        userWeekStart={userWeekStart}
        bookingAuditEnabled={bookingAuditEnabled}
      />
    </BookingDetailsSheetStoreProvider>
  );
}
