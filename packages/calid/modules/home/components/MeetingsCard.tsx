"use client";

import { Icon } from "@calid/features/ui/components/icon";
import { SkeletonText } from "@calid/features/ui/components/skeleton";
import { Tooltip } from "@calid/features/ui/components/tooltip";
import React, { useMemo, useState } from "react";

import type { getEventLocationValue } from "@calcom/app-store/locations";
import { getSuccessPageLocationMessage, guessEventLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { DatePicker } from "@calcom/ui/components/form";

type BookingOutput = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][0];

interface Meeting {
  id: string;
  title: string;
  time: string;
  location: string;
  locationToDisplay: string;
  locationType: string;
  locationUrl?: string;
  locationProviderLabel?: string;
  duration: string;
  color: "blue" | "pink" | "orange";
  startTime: Date;
}

const colorClasses = {
  blue: {
    bar: "bg-blue-500",
    badge: "bg-blue-100 text-blue-600",
  },
  pink: {
    bar: "bg-pink-500",
    badge: "bg-pink-100 text-pink-600",
  },
  orange: {
    bar: "bg-orange-500",
    badge: "bg-orange-100 text-orange-600",
  },
};

const colors: ("blue" | "pink" | "orange")[] = ["blue", "pink", "orange"];

function getIconFromLocationValue(value: string): string {
  switch (value) {
    case "phone":
    case "userPhone":
      return "phone";
    case "inPerson":
    case "attendeeInPerson":
      return "map-pin";
    case "link":
      return "link";
    case "somewhereElse":
      return "map";
    default:
      return "video";
  }
}

function transformBookingToMeeting(
  booking: BookingOutput,
  index: number,
  t: ReturnType<typeof useLocale>["t"]
): Meeting {
  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

  const location = booking.location as ReturnType<typeof getEventLocationValue>;
  const locationVideoCallUrl = booking.metadata?.videoCallUrl;
  const locationToDisplay = getSuccessPageLocationMessage(
    locationVideoCallUrl ? locationVideoCallUrl : location,
    t,
    booking.status
  );
  const provider = guessEventLocationType(location);

  const isUrl = typeof locationToDisplay === "string" && locationToDisplay.startsWith("http");

  return {
    id: booking.id.toString(),
    title: booking.title || "Untitled Meeting",
    time: dayjs(startTime).format("h:mm A"),
    location: location || "",
    locationToDisplay: typeof locationToDisplay === "string" ? locationToDisplay : "",
    locationType: location || "",
    locationUrl: isUrl ? locationToDisplay : undefined,
    locationProviderLabel: provider?.label,
    duration: `${durationMinutes} min`,
    color: colors[index % colors.length],
    startTime,
  };
}

function EmptyState() {
  const { t } = useLocale();
  return (
    <div className="flex flex-col items-center justify-center p-2 text-center">
      <div className="mb-4 rounded-full bg-blue-50 p-6">
        <Icon name="calendar-x-2" className="h-12 w-12 text-blue-500" />
      </div>
      <h3 className="text-default mb-1 text-lg font-semibold">{t("no_meetings")}</h3>
      <p className="text-subtle max-w-xs text-sm">{t("you_re_all_set")}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SkeletonText className="h-3 w-16" />
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="bg-emphasis h-16 w-1 animate-pulse rounded-full" />
            <div className="flex flex-1 flex-col gap-1">
              <SkeletonText className="h-4 w-48" />
              <div className="mt-1 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <SkeletonText className="h-3 w-3 rounded-full" />
                  <SkeletonText className="h-3 w-12" />
                </div>
                <div className="flex items-center gap-1">
                  <SkeletonText className="h-3 w-3 rounded-full" />
                  <SkeletonText className="h-3 w-24" />
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <SkeletonText className="h-5 w-12 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SkeletonText className="h-3 w-20" />
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="bg-emphasis h-16 w-1 animate-pulse rounded-full" />
            <div className="flex flex-1 flex-col gap-1">
              <SkeletonText className="h-4 w-48" />
              <div className="mt-1 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <SkeletonText className="h-3 w-3 rounded-full" />
                  <SkeletonText className="h-3 w-12" />
                </div>
                <div className="flex items-center gap-1">
                  <SkeletonText className="h-3 w-3 rounded-full" />
                  <SkeletonText className="h-3 w-24" />
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <SkeletonText className="h-5 w-12 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Meetings() {
  const { t } = useLocale();
  const { data: user } = useMeQuery();
  const timeZone = user?.timeZone || "UTC";
  const [selectedDate, setSelectedDate] = useState(() => dayjs().tz(timeZone));

  const selectedDateStart = useMemo(() => {
    return selectedDate.startOf("day").toISOString();
  }, [selectedDate]);

  const selectedDateEnd = useMemo(() => {
    return selectedDate.add(1, "day").endOf("day").toISOString();
  }, [selectedDate]);

  const isToday = useMemo(() => {
    return selectedDate.format("YYYY-MM-DD") === dayjs().tz(timeZone).format("YYYY-MM-DD");
  }, [selectedDate, timeZone]);

  const isPastDate = useMemo(() => {
    return selectedDate.isBefore(dayjs().tz(timeZone), "day");
  }, [selectedDate, timeZone]);

  const { data: upcomingBookingsData, isLoading: isLoadingUpcoming } = trpc.viewer.bookings.get.useQuery(
    {
      limit: 100,
      offset: 0,
      filters: {
        status: "upcoming",
        afterStartDate: selectedDateStart,
        beforeEndDate: selectedDateEnd,
      },
    },
    {
      enabled: !isPastDate,
    }
  );

  const { data: pastBookingsData, isLoading: isLoadingPast } = trpc.viewer.bookings.get.useQuery(
    {
      limit: 100,
      offset: 0,
      filters: {
        status: "past",
        afterStartDate: selectedDateStart,
        beforeEndDate: selectedDateEnd,
      },
    },
    {
      enabled: isToday || isPastDate,
    }
  );

  const bookingsData = useMemo(() => {
    if (isPastDate) {
      return pastBookingsData;
    } else if (isToday) {
      const upcomingBookings = upcomingBookingsData?.bookings || [];
      const pastBookings = pastBookingsData?.bookings || [];
      return {
        bookings: [...pastBookings, ...upcomingBookings],
      };
    } else {
      return upcomingBookingsData;
    }
  }, [isPastDate, isToday, pastBookingsData, upcomingBookingsData]);

  const isLoading = isLoadingUpcoming || isLoadingPast;

  const todaysMeetings = useMemo(() => {
    if (!bookingsData?.bookings) return [];

    const selectedDateStr = selectedDate.format("YYYY-MM-DD");
    const selectedBookings = bookingsData.bookings.filter((booking) => {
      const bookingDate = dayjs(booking.startTime).tz(timeZone);
      return bookingDate.format("YYYY-MM-DD") === selectedDateStr;
    });

    return selectedBookings
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .map((booking, index) => transformBookingToMeeting(booking, index, t));
  }, [bookingsData, selectedDate, timeZone, t]);

  const now = useMemo(() => new Date(), []);

  const pastMeetings = useMemo(() => {
    if (!isToday) return [];
    return todaysMeetings.filter((meeting) => meeting.startTime < now);
  }, [todaysMeetings, now, isToday]);

  const futureMeetings = useMemo(() => {
    if (!isToday) return [];
    return todaysMeetings.filter((meeting) => meeting.startTime >= now);
  }, [todaysMeetings, now, isToday]);

  const upcomingMeetings = useMemo(() => {
    return futureMeetings.slice(0, 1);
  }, [futureMeetings]);

  const laterMeetings = useMemo(() => {
    return futureMeetings.slice(1);
  }, [futureMeetings]);

  const totalMeetings = todaysMeetings.length;

  const handlePreviousDate = () => {
    setSelectedDate((prev) => prev.subtract(1, "day").tz(timeZone));
  };

  const handleNextDate = () => {
    setSelectedDate((prev) => prev.add(1, "day").tz(timeZone));
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(dayjs(date).tz(timeZone));
  };

  const selectedDateAsDate = useMemo(() => {
    return selectedDate.toDate();
  }, [selectedDate]);

  return (
    <div className="border-default bg-default flex h-80 w-full flex-shrink-0 flex-col overflow-hidden rounded-md border px-4 py-6">
      <div className="mb-6 flex flex-shrink-0 items-center justify-between">
        <div className="flex items-center gap-2 rounded-md bg-blue-100 px-2 py-1">
          <span className="text-sm font-semibold text-blue-600">
            {totalMeetings} {totalMeetings === 1 ? t("meeting") : t("meetings")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content="Previous Day">
            <button onClick={handlePreviousDate} className="flex">
              <div className="bg-default flex h-12 w-5 items-center justify-end">
                <div className="bg-primary flex h-5 w-5 items-center justify-center rounded-full border">
                  <Icon name="chevron-left" className="text-subtle h-4 w-4" />
                </div>
              </div>
            </button>
          </Tooltip>
          <DatePicker date={selectedDateAsDate} onDatesChange={handleDateSelect} minDate={null} />
          <Tooltip content="Next Day">
            <button onClick={handleNextDate} className="flex">
              <div className="bg-default flex h-12 w-5 items-center justify-end">
                <div className="bg-primary flex h-5 w-5 items-center justify-center rounded-full border">
                  <Icon name="chevron-right" className="text-subtle h-4 w-4" />
                </div>
              </div>
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        {isLoading ? (
          <Skeleton />
        ) : totalMeetings === 0 ? (
          <EmptyState />
        ) : isToday ? (
          <>
            {upcomingMeetings.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-default text-subtle text-xs font-medium uppercase tracking-wide">
                  {t("upcoming")}
                </h3>
                <div className="flex flex-col gap-3">
                  {upcomingMeetings.map((meeting) => (
                    <MeetingItem key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              </div>
            )}

            {laterMeetings.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-default text-subtle text-xs font-medium uppercase tracking-wide">
                  {t("later_today")}
                </h3>
                <div className="flex flex-col gap-3">
                  {laterMeetings.map((meeting) => (
                    <MeetingItem key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              </div>
            )}

            {pastMeetings.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-default text-subtle text-xs font-medium uppercase tracking-wide">
                  {t("earlier_today")}
                </h3>
                <div className="flex flex-col gap-3">
                  {pastMeetings.map((meeting) => (
                    <MeetingItem key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-3">
            {todaysMeetings.map((meeting) => (
              <MeetingItem key={meeting.id} meeting={meeting} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MeetingItem({ meeting }: { meeting: Meeting }) {
  const { t } = useLocale();
  const colors = colorClasses[meeting.color];
  const locationIcon = getIconFromLocationValue(meeting.locationType);

  return (
    <div className="flex items-start gap-3">
      <div className={`h-full w-1 rounded-full ${colors.bar}`} />
      <div className="flex flex-1 flex-col gap-1">
        <h4 className="text-default text-sm font-semibold">{meeting.title}</h4>
        <div className="text-default flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Icon name="clock-2" className="h-3 w-3" />
            <span>{meeting.time}</span>
          </div>
          {meeting.locationToDisplay && (
            <div className="flex items-center gap-1">
              {meeting.locationUrl ? (
                <a
                  href={meeting.locationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-active hover:underline"
                  onClick={(e) => e.stopPropagation()}
                  title={meeting.locationUrl}>
                  <div className="flex items-center gap-1">
                    <Icon name={locationIcon as any} className="h-3 w-3" />
                    {meeting.locationProviderLabel
                      ? t("join_event_location", { eventLocationType: meeting.locationProviderLabel })
                      : t("join_meeting")}
                  </div>
                </a>
              ) : (
                <div className="flex items-center gap-1">
                  <Icon name={locationIcon as any} className="h-3 w-3" />
                  <span>{meeting.locationToDisplay}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className={`rounded-md px-2 py-1 text-xs font-medium ${colors.badge}`}>{meeting.duration}</div>
      </div>
    </div>
  );
}
