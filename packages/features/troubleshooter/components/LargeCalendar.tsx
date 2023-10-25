import { useSession } from "next-auth/react";
import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import { trpc } from "@calcom/trpc/react";

import { useTroubleshooterStore } from "../store";

export const LargeCalendar = ({ extraDays }: { extraDays: number }) => {
  const selectedDate = useTroubleshooterStore((state) => state.selectedDate);
  const { data: session } = useSession();
  const date = selectedDate ? dayjs(selectedDate) : dayjs();

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
    return data?.busy.map((event) => {
      const id = typeof event.start === "string" ? event.start : event.start.toISOString();

      return {
        id,
        title: event.title ?? "Busy",
        start: new Date(event.start),
        end: new Date(event.end),
        options: {
          borderColor: "#F97417",
          status: "ACCEPTED",
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
