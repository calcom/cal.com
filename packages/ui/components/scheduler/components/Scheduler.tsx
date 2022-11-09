import React, { useEffect, useMemo, useRef } from "react";

import dayjs from "@calcom/dayjs";

import { useSchedulerStore } from "../state/store";
import { SchedulerComponentProps } from "../types/state";
import { DateValues } from "./DateValues/DateValues";
import { SchedulerHeading } from "./heading/SchedulerHeading";
import { HorizontalLines } from "./horizontalLines";
import { VeritcalLines } from "./verticalLines";

function getDaysBetweenDates(dateFrom: Date, dateTo: Date) {
  const dates = []; // this is as dayjs date
  let startDate = dayjs(dateFrom);
  dates.push(startDate);
  const endDate = dayjs(dateTo);
  while (startDate.isBefore(endDate)) {
    dates.push(startDate.add(1, "day"));
    startDate = startDate.add(1, "day");
  }
  return dates;
}

function getHoursToDisplay(startHour: number, endHour: number) {
  const dates = []; // this is as dayjs date
  let startDate = dayjs("1970-01-01").hour(startHour);
  dates.push(startDate);
  const endDate = dayjs("1970-01-01").hour(endHour);
  while (startDate.isBefore(endDate)) {
    dates.push(startDate.add(1, "hour"));
    startDate = startDate.add(1, "hour");
  }
  return dates;
}

const GridStopsPerHour = 4;

export function Scheduler(props: SchedulerComponentProps) {
  const initalState = useSchedulerStore((state) => state.initState);

  const { startDate, endDate, startHour, endHour, events } = useSchedulerStore((state) => ({
    startDate: state.startDate,
    endDate: state.endDate,
    startHour: state.startHour,
    endHour: state.endHour,
    events: state.events,
  }));

  const days = useMemo(() => getDaysBetweenDates(startDate, endDate), [startDate, endDate]);

  const hours = useMemo(() => getHoursToDisplay(startHour || 0, endHour || 23), [startHour, endHour]);

  // We have to add two due to the size of the grid spacing this would ideally be based on eventTypeStep
  // TOOD: make this dynamic to eventTypeStep
  const numberOfGridStopsPerDay = hours.length * GridStopsPerHour;

  useEffect(() => {
    initalState(props);
  }, [props, initalState]);

  // return <div>{JSON.stringify(state)}</div>;
  const container = useRef<HTMLDivElement | null>(null);
  const containerNav = useRef<HTMLDivElement | null>(null);
  const containerOffset = useRef<HTMLDivElement | null>(null);

  return (
    <div className="flex h-full w-full flex-col">
      {JSON.stringify(events)}
      <br />
      GridStop: {numberOfGridStopsPerDay}
      <br />
      Hours: {hours.length}
      <br />
      Start Hour: {startHour}
      <br />
      End Hour: {endHour}
      <SchedulerHeading />
      <div ref={container} className="isolate flex flex-auto flex-col overflow-auto bg-white">
        <div
          style={{ width: "165%" }}
          className="flex max-w-full flex-none flex-col sm:max-w-none md:max-w-full">
          <DateValues containerNavRef={containerNav} days={days} />
          <div className="flex flex-auto">
            <div className="sticky left-0 z-10 w-14 flex-none bg-white ring-1 ring-gray-100" />
            <div className="grid flex-auto grid-cols-1 grid-rows-1">
              <HorizontalLines hours={hours} />
              <VeritcalLines days={days} />

              {/* Events */}
              <ol
                className="col-start-1 col-end-2 row-start-1 grid grid-cols-1 sm:grid-cols-7 sm:pr-8"
                style={{
                  gridTemplateRows: `1.75rem repeat(${numberOfGridStopsPerDay}, minmax(0,1fr)) auto`,
                }}>
                {events.map((event) => {
                  const foundDay = days.findIndex((day) => day.isSame(event.start, "day"));
                  if (foundDay === -1) return null;

                  // Calculate the start and the percentage of the day
                  const eventStart = dayjs(event.start);
                  const eventEnd = dayjs(event.end);
                  const eventStartHour = eventStart.hour();
                  const eventStartDiff = eventStartHour - (startHour || 0);

                  // if (eventStart.isBefore(calendarDayStart) || eventEnd.isAfter(calendarDayEnd)) return null;

                  const eventDuration = eventEnd.diff(eventStart, "minutes");
                  const gridSpan = Math.round(eventDuration / (60 / GridStopsPerHour));
                  const visible = numberOfGridStopsPerDay / GridStopsPerHour;
                  const gridRowStart = eventStartDiff * GridStopsPerHour;

                  return (
                    <>
                      <li
                        className="sm:col-start-1s relative flex "
                        style={{
                          gridRow: `${gridRowStart + 2} / span ${gridSpan}`,
                          // Need to figure out how to put this in a media query
                          gridColumnStart: foundDay + 1,
                        }}>
                        <a
                          href="#"
                          className="group absolute inset-x-1 flex h-full flex-col overflow-y-auto rounded-lg bg-blue-50 text-xs leading-5 hover:bg-blue-100">
                          {eventDuration} mins
                          <br />
                          {visible}
                          <br />
                          {gridRowStart + 1}
                          <br />
                        </a>
                      </li>
                    </>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
