import React, { useEffect, useMemo, useRef } from "react";

import classNames from "@calcom/ui/classNames";

import { useCalendarStore } from "../state/store";
import "../styles/styles.css";
import type { CalendarComponentProps } from "../types/state";
import { getDaysBetweenDates, getHoursToDisplay } from "../utils";
import { DateValues } from "./DateValues";
import { CurrentTime } from "./currentTime";
import { AvailableCellsForDay, EmptyCell } from "./event/Empty";
import { EventList } from "./event/EventList";
import { SchedulerColumns } from "./grid";
import { SchedulerHeading } from "./heading/SchedulerHeading";
import { HorizontalLines } from "./horizontalLines";
import { Spinner } from "./spinner/Spinner";
import { VerticalLines } from "./verticalLines";

export function Calendar(props: CalendarComponentProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const containerNav = useRef<HTMLDivElement | null>(null);
  const containerOffset = useRef<HTMLDivElement | null>(null);
  const schedulerGrid = useRef<HTMLOListElement | null>(null);
  const initialState = useCalendarStore((state) => state.initState);

  const startDate = useCalendarStore((state) => state.startDate);
  const endDate = useCalendarStore((state) => state.endDate);
  const startHour = useCalendarStore((state) => state.startHour || 0);
  const endHour = useCalendarStore((state) => state.endHour || 23);
  const usersCellsStopsPerHour = useCalendarStore((state) => state.gridCellsPerHour || 4);
  const availableTimeslots = useCalendarStore((state) => state.availableTimeslots);
  const hideHeader = useCalendarStore((state) => state.hideHeader);
  const timezone = useCalendarStore((state) => state.timezone);
  const showBackgroundPattern = useCalendarStore((state) => state.showBackgroundPattern);
  const showBorder = useCalendarStore((state) => state.showBorder ?? true);
  const borderColor = useCalendarStore((state) => state.borderColor ?? "default");

  const days = useMemo(() => getDaysBetweenDates(startDate, endDate), [startDate, endDate]);

  const hours = useMemo(
    () => getHoursToDisplay(startHour || 0, endHour || 23, timezone),
    [startHour, endHour, timezone]
  );
  const numberOfGridStopsPerDay = hours.length * usersCellsStopsPerHour;
  const hourSize = 58;

  // Initalise State on initial mount
  useEffect(() => {
    initialState(props);
  }, [props, initialState]);

  return (
    <MobileNotSupported>
      <div
        className={classNames("scheduler-wrapper flex h-full w-full flex-col")}
        style={
          {
            "--one-minute-height": `calc(${hourSize}px/60)`,
            "--gridDefaultSize": `${hourSize}px`,
          } as React.CSSProperties // This can't live in the css file because it's a dynamic value and css variable gets super
        }>
        {hideHeader !== true && <SchedulerHeading />}
        {props.isPending && <Spinner />}
        <div
          ref={container}
          className="bg-default dark:bg-muted relative isolate flex h-full flex-auto flex-col">
          <div
            style={{ width: "165%" }}
            className="flex h-full max-w-full flex-none flex-col sm:max-w-none md:max-w-full">
            <DateValues
              containerNavRef={containerNav}
              days={days}
              showBorder={showBorder}
              borderColor={borderColor}
            />
            <div className="relative flex flex-auto">
              <CurrentTime timezone={timezone} />
              <div
                className={classNames(
                  "bg-default dark:bg-muted ring-muted sticky left-0 z-10 w-16 flex-none ring-1",
                  showBorder &&
                    (borderColor === "subtle"
                      ? "border-subtle border-l border-r"
                      : "border-default border-l border-r")
                )}
              />
              <div
                className="grid flex-auto grid-cols-1 grid-rows-1 [--disabled-gradient-background:#F8F9FB] [--disabled-gradient-foreground:#E6E7EB] dark:[--disabled-gradient-background:#262626] dark:[--disabled-gradient-foreground:#393939]"
                style={
                  showBackgroundPattern === false
                    ? undefined
                    : {
                        backgroundColor: "var(--disabled-gradient-background)",
                        background:
                          "repeating-linear-gradient(-45deg, var(--disabled-gradient-background), var(--disabled-gradient-background) 2.5px, var(--disabled-gradient-foreground) 2.5px, var(--disabled-gradient-foreground) 5px)",
                      }
                }>
                <HorizontalLines
                  hours={hours}
                  numberOfGridStopsPerCell={usersCellsStopsPerHour}
                  containerOffsetRef={containerOffset}
                  borderColor={borderColor}
                />
                <VerticalLines days={days} borderColor={borderColor} />

                <SchedulerColumns
                  offsetHeight={containerOffset.current?.offsetHeight}
                  gridStopsPerDay={numberOfGridStopsPerDay}>
                  {/*Loop over events per day  */}
                  {days.map((day, i) => {
                    return (
                      <li key={day.toISOString()} className="relative" style={{ gridColumnStart: i + 1 }}>
                        <EventList day={day} />
                        {/* <BlockedList day={day} containerRef={container} /> */}
                      </li>
                    );
                  })}
                </SchedulerColumns>

                {/* Empty Cells */}
                <SchedulerColumns
                  ref={schedulerGrid}
                  offsetHeight={containerOffset.current?.offsetHeight}
                  gridStopsPerDay={numberOfGridStopsPerDay}>
                  <>
                    {[...Array(days.length)].map((_, i) => (
                      <li
                        className="relative"
                        key={i}
                        style={{
                          gridRow: `1 / span ${numberOfGridStopsPerDay}`,
                        }}>
                        {/* While startDate < endDate:  */}
                        {availableTimeslots ? (
                          <AvailableCellsForDay
                            key={days[i].toISOString()}
                            timezone={timezone}
                            day={days[i]}
                            startHour={startHour}
                            availableSlots={availableTimeslots}
                          />
                        ) : (
                          <>
                            {[...Array(numberOfGridStopsPerDay)].map((_, j) => {
                              const key = `${i}-${j}`;
                              return (
                                <EmptyCell
                                  key={key}
                                  day={days[i]}
                                  gridCellIdx={j}
                                  totalGridCells={numberOfGridStopsPerDay}
                                  selectionLength={endHour - startHour}
                                  startHour={startHour}
                                  timezone={timezone}
                                />
                              );
                            })}
                          </>
                        )}
                      </li>
                    ))}
                  </>
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
      <div className="hidden h-full sm:block">{children}</div>
    </>
  );
};
