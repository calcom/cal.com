import { useEffect, useState, useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { CalendarEvent } from "@calcom/features/calendars/weeklyview/types/events";
import type { CalendarAvailableTimeslots } from "@calcom/features/calendars/weeklyview/types/state";

export const LargeCalendar = ({
  extraDays,
  showFakeEvents,
  allRoundedCorners,
  startDate,
  endDate,
  availableTimeslots = {},
}: {
  extraDays: number;
  showFakeEvents: boolean;
  allRoundedCorners?: boolean;
  startDate: Date;
  endDate: Date;
  availableTimeslots: CalendarAvailableTimeslots;
}) => {
  const eventDuration = 30;
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const availableSlots = useMemo(() => {
    console.log("availableTimeslots in LargeCalendar", availableTimeslots);
    return availableTimeslots || {};
  }, [availableTimeslots]);

  useEffect(() => {
    if (showFakeEvents) {
      const fakeEvents: CalendarEvent[] = [];
      let startDate = dayjs();
      const endDate = dayjs(startDate).add(extraDays - 1, "day");

      while (startDate <= endDate.add(1, "day")) {
        const dddd = startDate.format("dddd");

        switch (dddd) {
          case "Monday":
            fakeEvents.push(
              {
                id: 0,
                start: dayjs(startDate).set("hour", 9).set("minute", 0).toDate(),
                end: dayjs(startDate).set("hour", 10).set("minute", 0).toDate(),
                title: "Morning calibration",
                options: {
                  status: "ACCEPTED",
                },
              },
              {
                id: 0,
                start: dayjs(startDate).set("hour", 12).set("minute", 0).toDate(),
                end: dayjs(startDate).set("hour", 13).set("minute", 0).toDate(),
                title: "Into between Zomars",
                options: {
                  status: "ACCEPTED",
                },
              },
              {
                id: 0,
                start: dayjs(startDate).set("hour", 16).set("minute", 0).toDate(),
                end: dayjs(startDate).set("hour", 17).set("minute", 0).toDate(),
                title: "When a twitter DM is not enough",
                options: {
                  status: "ACCEPTED",
                },
              }
            );
            break;
          case "Tuesday":
            break;
          case "Wednesday":
            fakeEvents.push(
              {
                id: 0,
                start: dayjs(startDate).set("hour", 12).set("minute", 0).toDate(),
                end: dayjs(startDate).set("hour", 14).set("minute", 0).toDate(),
                title: "New feature discussion",
                options: {
                  status: "ACCEPTED",
                },
              },
              {
                id: 0,
                start: dayjs(startDate).set("hour", 16).set("minute", 0).toDate(),
                end: dayjs(startDate).set("hour", 18).set("minute", 0).toDate(),
                title: "Warp up meeting",
                options: {
                  status: "ACCEPTED",
                },
              }
            );
            break;
          case "Thursday":
            fakeEvents.push(
              {
                id: 0,
                start: dayjs(startDate).set("hour", 9).set("minute", 0).toDate(),
                end: dayjs(startDate).set("hour", 11).set("minute", 0).toDate(),
                title: "New feature discussion",
                options: {
                  status: "ACCEPTED",
                },
              },
              {
                id: 0,
                start: dayjs(startDate).set("hour", 13).set("minute", 0).toDate(),
                end: dayjs(startDate).set("hour", 15).set("minute", 0).toDate(),
                title: "YC mock interview",
                options: {
                  status: "ACCEPTED",
                },
              },
              {
                id: 0,
                start: dayjs(startDate).set("hour", 16).set("minute", 0).toDate(),
                end: dayjs(startDate).set("hour", 17).set("minute", 0).toDate(),
                title: "When a twitter DM is not enough",
                options: {
                  status: "PENDING",
                },
              }
            );
            break;
          case "Friday":
            fakeEvents.push(
              {
                id: 0,
                start: dayjs(startDate).set("hour", 12).set("minute", 0).toDate(),
                end: dayjs(startDate).set("hour", 13).set("minute", 0).add(30, "minute").toDate(),
                title: "Mock interview",
                options: {
                  status: "ACCEPTED",
                },
              },
              {
                id: 0,
                start: dayjs(startDate).set("hour", 12).set("minute", 0).toDate(),
                end: dayjs(startDate).set("hour", 13).set("minute", 0).toDate(),
                title: "Rountable",
                options: {
                  status: "ACCEPTED",
                },
              }
            );
            break;
          case "Saturday":
            break;
          case "Sunday":
            break;
        }

        startDate = startDate.add(1, "day");
      }

      setEvents(fakeEvents);
    } else {
    }
  }, [showFakeEvents, extraDays]);

  return (
    <div
      className={`w-full overflow-auto ${allRoundedCorners ? "rounded-2xl" : "rounded-l-2xl"}`}
      style={{
        maxHeight: `calc(100vh - ${allRoundedCorners ? "26rem" : "6rem"})`,
      }}>
      <Calendar
        isLoading={false}
        availableTimeslots={availableSlots}
        startHour={0}
        endHour={23}
        events={events}
        startDate={startDate}
        endDate={endDate}
        gridCellsPerHour={60 / eventDuration}
        hoverEventDuration={eventDuration}
        hideHeader
      />
    </div>
  );
};
