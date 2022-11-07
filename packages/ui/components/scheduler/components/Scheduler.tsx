import React, { useEffect, useMemo, useRef } from "react";

import dayjs from "@calcom/dayjs";

import { useSchedulerStore } from "../state/store";
import { SchedulerComponentProps } from "../types/state";
import { DateValues } from "./DateValues/DateValues";
import { SchedulerHeading } from "./heading/SchedulerHeading";

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
  const endDate = dayjs("1970-01-01").hour(endHour + 1);
  while (startDate.isBefore(endDate)) {
    dates.push(startDate.add(1, "hour"));
    startDate = startDate.add(1, "hour");
  }
  return dates;
}

export function Scheduler(props: SchedulerComponentProps) {
  const initalState = useSchedulerStore((state) => state.initState);

  const { startDate, endDate, startHour, endHour } = useSchedulerStore((state) => ({
    startDate: state.startDate,
    endDate: state.endDate,
    startHour: state.startHour,
    endHour: state.endHour,
  }));

  const days = useMemo(() => getDaysBetweenDates(startDate, endDate), [startDate, endDate]);

  const hours = useMemo(() => getHoursToDisplay(startHour || 0, endHour || 23), [startHour, endHour]);

  useEffect(() => {
    initalState(props);
  }, [props, initalState]);

  // return <div>{JSON.stringify(state)}</div>;
  const container = useRef<HTMLDivElement | null>(null);
  const containerNav = useRef<HTMLDivElement | null>(null);
  const containerOffset = useRef<HTMLDivElement | null>(null);

  return (
    <div className="flex h-full w-full flex-col">
      <SchedulerHeading />
      <div ref={container} className="isolate flex flex-auto flex-col overflow-auto bg-white">
        <div
          style={{ width: "165%" }}
          className="flex max-w-full flex-none flex-col sm:max-w-none md:max-w-full">
          <DateValues containerNavRef={containerNav} days={days} />
          <div className="flex flex-auto">
            <div className="sticky left-0 z-10 w-14 flex-none bg-white ring-1 ring-gray-100" />
            <div className="grid flex-auto grid-cols-1 grid-rows-1">
              {/* Horizontal lines */}
              <div
                className="col-start-1 col-end-2 row-start-1 grid divide-y divide-gray-100"
                style={{ gridTemplateRows: "repeat(48, minmax(3.5rem, 1fr))" }}>
                <div ref={containerOffset} className="row-end-1 h-7" />
                {hours.map((hour) => (
                  <div key={hour.toString()}>
                    <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5 text-gray-400">
                      {hour.format("h A")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Vertical lines */}
              <div className="col-start-1 col-end-2 row-start-1 hidden grid-cols-7 grid-rows-1 divide-x divide-gray-100 sm:grid sm:grid-cols-7">
                {days.map((_, i) => (
                  <div
                    key={`Key_vertical_${i}`}
                    className="row-span-full"
                    style={{
                      gridColumnStart: i + 1,
                    }}
                  />
                ))}
                <div className="col-start-8 row-span-full w-8" />
              </div>

              {/* Events */}
              <ol
                className="col-start-1 col-end-2 row-start-1 grid grid-cols-1 sm:grid-cols-7 sm:pr-8"
                style={{ gridTemplateRows: "1.75rem repeat(288, minmax(0, 1fr)) auto" }}>
                <li className="relative mt-px flex sm:col-start-3" style={{ gridRow: "74 / span 12" }}>
                  <a
                    href="#"
                    className="group absolute inset-1 flex flex-col overflow-y-auto rounded-lg bg-blue-50 p-2 text-xs leading-5 hover:bg-blue-100">
                    <p className="order-1 font-semibold text-blue-700">Breakfast</p>
                    <p className="text-blue-500 group-hover:text-blue-700">
                      <time dateTime="2022-01-12T06:00">6:00 AM</time>
                    </p>
                  </a>
                </li>
                <li className="relative mt-px flex sm:col-start-3" style={{ gridRow: "92 / span 30" }}>
                  <a
                    href="#"
                    className="group absolute inset-1 flex flex-col overflow-y-auto rounded-lg bg-pink-50 p-2 text-xs leading-5 hover:bg-pink-100">
                    <p className="order-1 font-semibold text-pink-700">Flight to Paris</p>
                    <p className="text-pink-500 group-hover:text-pink-700">
                      <time dateTime="2022-01-12T07:30">7:30 AM</time>
                    </p>
                  </a>
                </li>
                <li
                  className="relative mt-px hidden sm:col-start-6 sm:flex"
                  style={{ gridRow: "122 / span 24" }}>
                  <a
                    href="#"
                    className="group absolute inset-1 flex flex-col overflow-y-auto rounded-lg bg-gray-100 p-2 text-xs leading-5 hover:bg-gray-200">
                    <p className="order-1 font-semibold text-gray-700">Meeting with design team at Disney</p>
                    <p className="text-gray-500 group-hover:text-gray-700">
                      <time dateTime="2022-01-15T10:00">10:00 AM</time>
                    </p>
                  </a>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
