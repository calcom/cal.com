import React, { useEffect, useMemo, useRef } from "react";

import { useCalendarStore } from "../state/store";
import "../styles/styles.css";
import type { CalendarComponentProps } from "../types/state";
import { getDaysBetweenDates, getHoursToDisplay } from "../utils";
import { DateValues } from "./DateValues";
import { BlockedList } from "./blocking/BlockedList";
import { EmptyCell } from "./event/Empty";
import { EventList } from "./event/EventList";
import { SchedulerColumns } from "./grid";
import { SchedulerHeading } from "./heading/SchedulerHeading";
import { HorizontalLines } from "./horizontalLines";
import { VeritcalLines } from "./verticalLines";

export function Calendar(props: CalendarComponentProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const containerNav = useRef<HTMLDivElement | null>(null);
  const containerOffset = useRef<HTMLDivElement | null>(null);
  const initalState = useCalendarStore((state) => state.initState);

  const startDate = useCalendarStore((state) => state.startDate);
  const endDate = useCalendarStore((state) => state.endDate);
  const startHour = useCalendarStore((state) => state.startHour || 0);
  const endHour = useCalendarStore((state) => state.endHour || 23);
  const usersCellsStopsPerHour = useCalendarStore((state) => state.gridCellsPerHour || 4);

  const days = useMemo(() => getDaysBetweenDates(startDate, endDate), [startDate, endDate]);

  const hours = useMemo(() => getHoursToDisplay(startHour || 0, endHour || 23), [startHour, endHour]);

  const numberOfGridStopsPerDay = hours.length * usersCellsStopsPerHour;

  // Initalise State on inital mount
  useEffect(() => {
    initalState(props);
  }, [props, initalState]);

  return (
    <MobileNotSupported>
      <div
        className="scheduler-wrapper flex h-full w-full flex-col overflow-y-scroll"
        style={
          { "--one-minute-height": `calc(1.75rem/(60/${usersCellsStopsPerHour}))` } as React.CSSProperties // This can't live in the css file because it's a dynamic value and css variable gets super
        }>
        <SchedulerHeading />
        <div ref={container} className="bg-default relative isolate flex  flex-auto flex-col">
          <div
            style={{ width: "165%" }}
            className="flex max-w-full flex-none flex-col sm:max-w-none md:max-w-full">
            <DateValues containerNavRef={containerNav} days={days} />
            {/* TODO: Implement this at a later date. */}
            {/* <CurrentTime
            containerNavRef={containerNav}
            containerOffsetRef={containerOffset}
            containerRef={container}
          /> */}
            <div className="flex flex-auto">
              <div className="bg-default sticky left-0 z-10 w-14 flex-none ring-1 ring-muted" />
              <div className="grid flex-auto grid-cols-1 grid-rows-1 ">
                <HorizontalLines
                  hours={hours}
                  numberOfGridStopsPerCell={usersCellsStopsPerHour}
                  containerOffsetRef={containerOffset}
                />
                <VeritcalLines days={days} />

                {/* Empty Cells */}
                <SchedulerColumns
                  zIndex={50}
                  offsetHeight={containerOffset.current?.offsetHeight}
                  gridStopsPerDay={numberOfGridStopsPerDay}>
                  <>
                    {[...Array(days.length)].map((_, i) => (
                      <li
                        key={i}
                        style={{
                          gridRow: `2 / span ${numberOfGridStopsPerDay}`,
                          position: "relative",
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
                  </>
                </SchedulerColumns>

                <SchedulerColumns
                  offsetHeight={containerOffset.current?.offsetHeight}
                  gridStopsPerDay={numberOfGridStopsPerDay}>
                  {/*Loop over events per day  */}
                  {days.map((day, i) => {
                    return (
                      <li key={day.toISOString()} className="relative" style={{ gridColumnStart: i + 1 }}>
                        <EventList day={day} />
                        <BlockedList day={day} containerRef={container} />
                      </li>
                    );
                  })}
                </SchedulerColumns>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileNotSupported>
  );
}

/** @todo Will be removed once we have mobile support */
const MobileNotSupported = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <div className="flex h-full flex-col items-center justify-center sm:hidden">
        <h1 className="text-2xl font-bold">Mobile not supported yet </h1>
        <p className="text-subtle">Please use a desktop browser to view this page</p>
      </div>
      <div className="hidden sm:block">{children}</div>
    </>
  );
};
