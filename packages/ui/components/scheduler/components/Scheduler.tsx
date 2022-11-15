import React, { useEffect, useMemo, useRef } from "react";

import dayjs from "@calcom/dayjs";

import { Event } from "../components/event";
import { useSchedulerStore } from "../state/store";
import { SchedulerComponentProps } from "../types/state";
import { getDaysBetweenDates, getHoursToDisplay } from "../utils";
import { DateValues } from "./DateValues/DateValues";
import { EmptyCell } from "./event/Empty";
import { SchedulerHeading } from "./heading/SchedulerHeading";
import { HorizontalLines } from "./horizontalLines";
import { VeritcalLines } from "./verticalLines";

export function Scheduler(props: SchedulerComponentProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const containerNav = useRef<HTMLDivElement | null>(null);
  const containerOffset = useRef<HTMLDivElement | null>(null);
  const initalState = useSchedulerStore((state) => state.initState);

  const { startDate, endDate, startHour, endHour, events, usersCellsStopsPerHour } = useSchedulerStore(
    (state) => ({
      startDate: state.startDate,
      endDate: state.endDate,
      startHour: state.startHour || 0,
      endHour: state.endHour || 23,
      events: state.events,
      usersCellsStopsPerHour: state.gridCellsPerHour || 4,
    })
  );

  const days = useMemo(() => getDaysBetweenDates(startDate, endDate), [startDate, endDate]);

  const hours = useMemo(() => getHoursToDisplay(startHour || 0, endHour || 23), [startHour, endHour]);

  const numberOfGridStopsPerDay = hours.length * usersCellsStopsPerHour;

  // Initalise State on inital mount
  useEffect(() => {
    initalState(props);
  }, [props, initalState]);

  return (
    <div
      className="flex h-full w-full flex-col"
      style={
        { "--one-minute-height": `calc(1.75rem/(60/${usersCellsStopsPerHour}))` } as React.CSSProperties
      }>
      <SchedulerHeading />
      <div ref={container} className="isolate flex flex-auto flex-col  bg-white">
        <div
          style={{ width: "165%" }}
          className="flex max-w-full flex-none flex-col sm:max-w-none md:max-w-full">
          {/* <CurrentTime
            containerNavRef={containerNav}
            containerOffsetRef={containerOffset}
            containerRef={container}
          /> */}
          <DateValues containerNavRef={containerNav} days={days} />
          <div className="flex flex-auto">
            <div className="sticky left-0 z-10 w-14 flex-none bg-white ring-1 ring-gray-100" />
            <div className="grid flex-auto grid-cols-1 grid-rows-1 ">
              <HorizontalLines
                hours={hours}
                numberOfGridStopsPerCell={usersCellsStopsPerHour}
                containerOffsetRef={containerOffset}
              />
              <VeritcalLines days={days} />

              {/* Empty Cells */}
              <ol
                className="z-50 col-start-1 col-end-2 row-start-1 grid grid-cols-1 sm:grid-cols-7 sm:pr-8"
                style={{
                  gridTemplateRows: `1.75rem repeat(${numberOfGridStopsPerDay}, 1.75rem) auto`,
                }}>
                <>
                  {[...Array(days.length)].map((_, i) => (
                    <li
                      key={i}
                      className="relative flex sm:grid"
                      style={{
                        gridRow: `2 / span ${numberOfGridStopsPerDay}`,
                      }}>
                      {/* While startDate < endDate:  */}
                      {[...Array(numberOfGridStopsPerDay)].map((_, j) => {
                        const key = `${i}-${j}`;
                        return (
                          <EmptyCell
                            key={key}
                            day={days[i].toDate()}
                            gridCellIdx={j}
                            totalGridCells={numberOfGridStopsPerDay}
                            selectionLength={endHour - startHour}
                            startHour={startHour}
                          />
                        );
                      })}
                    </li>
                  ))}
                  {/* <BlockedList days={days} numberOfGridStopsPerCell={usersCellsStopsPerHour} /> */}
                </>
              </ol>
              <ol
                className="relative col-start-1 col-end-2 row-start-1 grid grid-cols-1 sm:grid-cols-7 sm:pr-8"
                style={{
                  gridTemplateRows: `1.75rem repeat(${numberOfGridStopsPerDay}, 1.75rem) auto`,
                }}>
                {/*Loop over events per day  */}
                {days.map((day, i) => {
                  return (
                    <div
                      key={day.toISOString()}
                      className="relative"
                      style={{ gridColumnStart: i + 1, marginTop: containerOffset.current?.offsetHeight }}>
                      {events
                        .filter((event) => {
                          return dayjs(event.start).isSame(day, "day");
                        })
                        .map((event) => {
                          const eventStart = dayjs(event.start);
                          const eventEnd = dayjs(event.end);

                          const eventDuration = eventEnd.diff(eventStart, "minutes");

                          const eventStartHour = eventStart.hour();
                          const eventStartDiff = (eventStartHour - (startHour || 0)) * 60;

                          return (
                            <div
                              key={`${event.id}-${eventStart.toISOString()}`}
                              className="absolute inset-x-1 z-50 w-[90%]"
                              style={{
                                top: `calc(${eventStartDiff}*var(--one-minute-height))`,
                                height: `calc(${eventDuration}*var(--one-minute-height))`,
                              }}>
                              <Event event={event} eventDuration={eventDuration} />
                            </div>
                          );
                        })}
                    </div>
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
