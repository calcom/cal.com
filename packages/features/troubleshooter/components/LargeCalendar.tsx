import { useSession } from "next-auth/react";
import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import { BookingStatus } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

import { useTroubleshooterStore } from "../store";

export const LargeCalendar = ({ extraDays }: { extraDays: number }) => {
  const selectedDate = useTroubleshooterStore((state) => state.selectedDate);
  const { data: session } = useSession();
  const date = selectedDate ? dayjs(selectedDate) : dayjs();

  const { data: schedule } = useSchedule({
    username: session?.user.username || "",
    eventSlug: eventSlug,
    eventId: event.data?.id ?? eventId,
    monthCount,
    rescheduleUid,
  });

  const { data, isLoading } = trpc.viewer.availability.user.useQuery(
    {
      username: session?.user?.username || "",
      dateFrom: date.startOf("day").utc().format(),
      dateTo: date.endOf("day").utc().format(),
      withSource: true,
    },
    {
      enabled: !!session?.user?.username,
    }
  );
  const startDate = selectedDate ? dayjs(selectedDate).toDate() : dayjs().toDate();
  const endDate = dayjs(startDate)
    .add(extraDays - 1, "day")
    .toDate();

  const events = useMemo(() => {
    if (!data?.busy) return [];
    return data?.busy.map((event, idx) => {
      return {
        id: idx,
        title: event.title ?? "Busy",
        start: new Date(event.start),
        end: new Date(event.end),
        options: {
          borderColor: "#F97417",
          status: BookingStatus.ACCEPTED,
        },
      };
    });
  }, [data]);

  return (
    <div className="h-full [--calendar-dates-sticky-offset:66px]">
      <Calendar
        startHour={0}
        endHour={23}
        events={events}
        startDate={startDate}
        endDate={endDate}
        gridCellsPerHour={60 / 15}
        hoverEventDuration={30}
        hideHeader
      />
    </div>
  );
};
