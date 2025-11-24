"use client";

import { Icon } from "@calid/features/ui/components/icon";
import React, { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

interface WeekStats {
  totalMeetings: number;
  totalHours: number;
  busiestDay: string | null;
  reschedules: number;
  cancellations: number;
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="bg-default border-default flex items-start gap-3 rounded-xl border p-4">
      <Icon name={icon as any} className="text-default h-5 w-5" />
      <div className="min-w-0 flex-1">
        <p className="text-default mb-1 text-sm font-medium">{label}</p>
        <p className="text-default text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

export function WeekActivity() {
  const { data: user } = useMeQuery();
  const timeZone = user?.timeZone || "UTC";

  const weekStart = useMemo(() => {
    return dayjs().tz(timeZone).startOf("week").toISOString();
  }, [timeZone]);

  const weekEnd = useMemo(() => {
    return dayjs().tz(timeZone).endOf("week").toISOString();
  }, [timeZone]);

  // Fetch both upcoming and past bookings for the week
  // Note: limit is max 100 per the API schema
  const { data: upcomingBookings, isLoading: isLoadingUpcoming } = trpc.viewer.bookings.get.useQuery({
    limit: 100,
    offset: 0,
    filters: {
      status: "upcoming",
      afterStartDate: weekStart,
      beforeEndDate: weekEnd,
    },
  });

  const { data: pastBookings, isLoading: isLoadingPast } = trpc.viewer.bookings.get.useQuery({
    limit: 100,
    offset: 0,
    filters: {
      status: "past",
      afterStartDate: weekStart,
      beforeEndDate: weekEnd,
    },
  });

  const { data: cancelledBookings, isLoading: isLoadingCancelled } = trpc.viewer.bookings.get.useQuery({
    limit: 100,
    offset: 0,
    filters: {
      status: "cancelled",
      afterStartDate: weekStart,
      beforeEndDate: weekEnd,
    },
  });

  const isLoading = isLoadingUpcoming || isLoadingPast || isLoadingCancelled;

  // Combine all bookings
  const bookingsData = useMemo(() => {
    const allBookings = [
      ...(upcomingBookings?.bookings || []),
      ...(pastBookings?.bookings || []),
      ...(cancelledBookings?.bookings || []),
    ];

    // Deduplicate by booking ID
    const uniqueBookings = Array.from(new Map(allBookings.map((booking) => [booking.id, booking])).values());

    return { bookings: uniqueBookings };
  }, [upcomingBookings, pastBookings, cancelledBookings]);

  const weekStats = useMemo((): WeekStats => {
    if (!bookingsData?.bookings) {
      return {
        totalMeetings: 0,
        totalHours: 0,
        busiestDay: null,
        reschedules: 0,
        cancellations: 0,
      };
    }

    const weekStartDate = dayjs(weekStart).tz(timeZone).startOf("day");
    const weekEndDate = dayjs(weekEnd).tz(timeZone).endOf("day");

    // Filter bookings for the current week
    const weekBookings = bookingsData.bookings.filter((booking) => {
      const bookingDate = dayjs(booking.startTime).tz(timeZone);
      const bookingTimestamp = bookingDate.valueOf();
      const startTimestamp = weekStartDate.valueOf();
      const endTimestamp = weekEndDate.valueOf();
      return bookingTimestamp >= startTimestamp && bookingTimestamp <= endTimestamp;
    });

    // Calculate total meetings
    const totalMeetings = weekBookings.length;

    // Calculate total hours
    const totalHours = weekBookings.reduce((total, booking) => {
      const start = new Date(booking.startTime);
      const end = new Date(booking.endTime);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + durationHours;
    }, 0);

    // Find busiest day based on total meeting duration (hours) per day
    const dayHours: Record<string, number> = {};
    weekBookings.forEach((booking) => {
      const bookingDate = dayjs(booking.startTime).tz(timeZone);
      const dayName = bookingDate.format("dddd"); // Full day name (Monday, Tuesday, etc.)
      const start = new Date(booking.startTime);
      const end = new Date(booking.endTime);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      dayHours[dayName] = (dayHours[dayName] || 0) + durationHours;
    });

    const busiestDay =
      Object.keys(dayHours).length > 0
        ? Object.entries(dayHours).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
        : null;

    // Count reschedules (bookings with rescheduled=true or fromReschedule field)
    const reschedules = weekBookings.filter(
      (booking) => booking.rescheduled === true || booking.fromReschedule !== null
    ).length;

    // Count cancellations (check both enum values and lowercase strings)
    const cancellations = weekBookings.filter((booking) => {
      const status = String(booking.status).toUpperCase();
      return status === "CANCELLED" || status === "REJECTED";
    }).length;

    return {
      totalMeetings,
      totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
      busiestDay,
      reschedules,
      cancellations,
    };
  }, [bookingsData, timeZone, weekStart, weekEnd]);

  return (
    <div className="border-default bg-default flex h-full w-full flex-col rounded-3xl border px-4 py-6 shadow-md">
      <div className="mb-6">
        <h2 className="text-default mb-1 text-lg font-bold">Your week at a Glance</h2>
        <p className="text-subtle text-sm">Your weekly calendar insights at a glance</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-muted text-sm">Loading week data...</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3">
            <StatCard icon="calendar" label="Total Meetings" value={weekStats.totalMeetings} />
            <StatCard icon="clock-2" label="Total Hours Booked" value={`${weekStats.totalHours}h`} />
            {weekStats.busiestDay && (
              <StatCard icon="activity" label="Busiest Day" value={weekStats.busiestDay} />
            )}
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon="refresh-cw" label="Reschedules" value={weekStats.reschedules} />
              <StatCard icon="circle-alert" label="Cancellations" value={weekStats.cancellations} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
