import type { EventType } from "@prisma/client";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import type { z } from "zod";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import DatePicker from "@calcom/features/calendars/DatePicker";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { TimeFormat } from "@calcom/lib/timeFormat";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";

import useRouterQuery from "@lib/hooks/useRouterQuery";

const AvailableTimes = dynamic(() => import("@components/booking/AvailableTimes"));

const getRefetchInterval = (refetchCount: number): number => {
  const intervals = [3000, 3000, 5000, 10000, 20000, 30000] as const;
  return intervals[refetchCount] || intervals[intervals.length - 1];
};

const useSlots = ({
  eventTypeId,
  eventTypeSlug,
  startTime,
  endTime,
  usernameList,
  timeZone,
  duration,
  enabled = true,
}: {
  eventTypeId: number;
  eventTypeSlug: string;
  startTime?: Dayjs;
  endTime?: Dayjs;
  usernameList: string[];
  timeZone?: string;
  duration?: string;
  enabled?: boolean;
}) => {
  const [refetchCount, setRefetchCount] = useState(0);
  const refetchInterval = getRefetchInterval(refetchCount);
  const { data, isLoading, isPaused, fetchStatus } = trpc.viewer.public.slots.getSchedule.useQuery(
    {
      eventTypeId,
      eventTypeSlug,
      usernameList,
      startTime: startTime?.toISOString() || "",
      endTime: endTime?.toISOString() || "",
      timeZone,
      duration,
    },
    {
      enabled: !!startTime && !!endTime && enabled,
      refetchInterval,
      trpc: { context: { skipBatch: true } },
    }
  );
  useEffect(() => {
    if (!!data && fetchStatus === "idle") {
      setRefetchCount(refetchCount + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStatus, data]);

  // The very first time isPaused is set if auto-fetch is disabled, so isPaused should also be considered a loading state.
  return { slots: data?.slots || {}, isLoading: isLoading || isPaused };
};

export const SlotPicker = ({
  eventType,
  timeFormat,
  onTimeFormatChange,
  timeZone,
  recurringEventCount,
  users,
  seatsPerTimeSlot,
  weekStart = 0,
  ethSignature,
}: {
  eventType: Pick<
    EventType & { metadata: z.infer<typeof EventTypeMetaDataSchema> },
    "id" | "schedulingType" | "slug" | "length" | "metadata"
  >;
  timeFormat: TimeFormat;
  onTimeFormatChange: (is24Hour: boolean) => void;
  timeZone?: string;
  seatsPerTimeSlot?: number;
  recurringEventCount?: number;
  users: string[];
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  ethSignature?: string;
}) => {
  const [selectedDate, setSelectedDate] = useState<Dayjs>();
  const [browsingDate, setBrowsingDate] = useState<Dayjs>();
  let { duration = eventType.length.toString() } = useRouterQuery("duration");
  const { date, setQuery: setDate } = useRouterQuery("date");
  const { month, setQuery: setMonth } = useRouterQuery("month");
  const router = useRouter();

  if (!eventType.metadata?.multipleDuration) {
    duration = eventType.length.toString();
  }

  useEffect(() => {
    if (!router.isReady) return;

    // Etc/GMT is not actually a timeZone, so handle this select option explicitly to prevent a hard crash.
    if (timeZone === "Etc/GMT") {
      setBrowsingDate(dayjs.utc(month).set("date", 1).set("hour", 0).set("minute", 0).set("second", 0));
      if (date) {
        setSelectedDate(dayjs.utc(date));
      }
    } else {
      // Set the start of the month without shifting time like startOf() may do.
      setBrowsingDate(
        dayjs.tz(month, timeZone).set("date", 1).set("hour", 0).set("minute", 0).set("second", 0)
      );
      if (date) {
        // It's important to set the date immediately to the timeZone, dayjs(date) will convert to browsertime.
        setSelectedDate(dayjs.tz(date, timeZone));
      }
    }
  }, [router.isReady, month, date, duration, timeZone]);

  const { i18n, isLocaleReady } = useLocale();
  const { slots: monthSlots, isLoading } = useSlots({
    eventTypeId: eventType.id,
    eventTypeSlug: eventType.slug,
    usernameList: users,
    startTime:
      browsingDate === undefined || browsingDate.get("month") === dayjs.tz(undefined, timeZone).get("month")
        ? dayjs.tz(undefined, timeZone).subtract(2, "days").startOf("day")
        : browsingDate?.startOf("month"),
    endTime: browsingDate?.endOf("month"),
    timeZone,
    duration,
  });
  const { slots: selectedDateSlots, isLoading: _isLoadingSelectedDateSlots } = useSlots({
    eventTypeId: eventType.id,
    eventTypeSlug: eventType.slug,
    usernameList: users,
    startTime: selectedDate?.startOf("day"),
    endTime: selectedDate?.endOf("day"),
    timeZone,
    duration,
    /** Prevent refetching is we already have this data from month slots */
    enabled: !!selectedDate,
  });

  /** Hide skeleton if we have the slot loaded in the month query */
  const isLoadingSelectedDateSlots = (() => {
    if (!selectedDate) return _isLoadingSelectedDateSlots;
    if (!!selectedDateSlots[selectedDate.format("YYYY-MM-DD")]) return false;
    if (!!monthSlots[selectedDate.format("YYYY-MM-DD")]) return false;
    return false;
  })();

  return (
    <>
      <DatePicker
        isLoading={isLoading}
        className={classNames(
          "mt-8 px-4 pb-4 sm:mt-0 md:min-w-[300px] md:px-4 lg:min-w-[455px]",
          selectedDate ? "sm:dark:border-darkgray-200 border-gray-200 sm:border-r sm:p-4 sm:pr-6" : "sm:p-4"
        )}
        includedDates={Object.keys(monthSlots).filter((k) => monthSlots[k].length > 0)}
        locale={isLocaleReady ? i18n.language : "en"}
        selected={selectedDate}
        onChange={(newDate) => {
          setDate(newDate.format("YYYY-MM-DD"));
        }}
        onMonthChange={(newMonth) => {
          setMonth(newMonth.format("YYYY-MM"));
        }}
        browsingDate={browsingDate}
        weekStart={weekStart}
      />
      <AvailableTimes
        isLoading={isLoadingSelectedDateSlots}
        slots={
          selectedDate &&
          (selectedDateSlots[selectedDate.format("YYYY-MM-DD")] ||
            monthSlots[selectedDate.format("YYYY-MM-DD")])
        }
        date={selectedDate}
        timeFormat={timeFormat}
        onTimeFormatChange={onTimeFormatChange}
        eventTypeId={eventType.id}
        eventTypeSlug={eventType.slug}
        seatsPerTimeSlot={seatsPerTimeSlot}
        recurringCount={recurringEventCount}
        ethSignature={ethSignature}
      />
    </>
  );
};
