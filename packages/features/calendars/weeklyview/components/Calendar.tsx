import React, { useEffect, useMemo, useRef } from "react";

import classNames from "@calcom/ui/classNames";

import { CalendarStoreContext, createCalendarStore, useCalendarStore } from "../state/store";
import "../styles/styles.css";
import type { CalendarComponentProps } from "../types/state";
import { getDaysBetweenDates, getHoursToDisplay } from "../utils";
import { DateValues } from "./DateValues";
import { CurrentTime } from "./currentTime";
import { DragSelectOverlay, useDragSelect } from "./drag";
import { AvailableCellsForDay, EmptyCell } from "./event/Empty";
import { EventList } from "./event/EventList";
import { SchedulerColumns } from "./grid";
import { SchedulerHeading } from "./heading/SchedulerHeading";
import { HorizontalLines } from "./horizontalLines";
import { Spinner } from "./spinner/Spinner";
import { VerticalLines } from "./verticalLines";

function CalendarInner(props: CalendarComponentProps) {
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
  const scrollToCurrentTime = useCalendarStore((state) => state.scrollToCurrentTime ?? true);
  // Drag-select state
  const enableDragSelect = useCalendarStore((state) => state.enableDragSelect ?? false);
  const hoverEventDuration = useCalendarStore((state) => state.hoverEventDuration ?? 30);

  const days = useMemo(() => getDaysBetweenDates(startDate, endDate), [startDate, endDate]);

  // Get events for busy-time checking
  const events = useCalendarStore((state) => state.events);

  // Drag-select hook (returns no-op handlers when disabled)
  const { gridRef: dragGridRef, handlers: dragHandlers } = useDragSelect({
    enabled: enableDragSelect,
    timezone,
    startHour,
    hoverEventDuration,
    days,
    events,
  });

  const hours = useMemo(
    () => getHoursToDisplay(startHour || 0, endHour || 23, timezone),
    [startHour, endHour, timezone]
  );
  const numberOfGridStopsPerDay = hours.length * usersCellsStopsPerHour;
  const hourSize = 58;

  // Initalise State on initial mount and when props change
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
          className="bg-default dark:bg-cal-muted relative isolate flex h-full flex-auto flex-col overflow-auto">
          <div className="flex min-h-min w-full flex-none flex-col">
            <DateValues
              containerNavRef={containerNav}
              days={days}
              showBorder={showBorder}
              borderColor={borderColor}
            />
            <div className="relative flex flex-auto">
              <CurrentTime timezone={timezone} scrollToCurrentTime={scrollToCurrentTime} />
              <div
                className={classNames(
                  "bg-default dark:bg-cal-muted ring-muted sticky left-0 z-10 w-16 flex-none ring-1",
                  showBorder &&
                  (borderColor === "subtle"
                    ? "border-subtle border-l border-r"
                    : "border-default border-l border-r")
                )}
              />
              <div
                ref={enableDragSelect ? dragGridRef : undefined}
                className={classNames(
                  "grid flex-auto grid-cols-1 grid-rows-1 [--disabled-gradient-background:#F8F9FB] [--disabled-gradient-foreground:#E6E7EB] dark:[--disabled-gradient-background:#262626] dark:[--disabled-gradient-foreground:#393939]",
                  enableDragSelect && "select-none"
                )}
                style={
                  showBackgroundPattern === false
                    ? undefined
                    : {
                        backgroundColor: "var(--disabled-gradient-background)",
                        background:
                          "repeating-linear-gradient(-45deg, var(--disabled-gradient-background), var(--disabled-gradient-background) 2.5px, var(--disabled-gradient-foreground) 2.5px, var(--disabled-gradient-foreground) 5px)",
                      }
                }
                {...(enableDragSelect ? dragHandlers : {})}>
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
                          gridColumnStart: i + 1,
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

                {/* Drag-select overlay (only renders when enableDragSelect is true) */}
                {enableDragSelect && (
                  <DragSelectOverlay days={days} timezone={timezone} startHour={startHour} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileNotSupported>
  );
}

export function Calendar(props: CalendarComponentProps) {
  const storeRef = useRef<ReturnType<typeof createCalendarStore> | null>(null);

  if (!storeRef.current) {
    storeRef.current = createCalendarStore();
    storeRef.current.getState().initState(props);
  }

  useEffect(() => {
    if (storeRef.current) {
      storeRef.current.getState().initState(props);
    }
  }, [props]);

  return (
    <CalendarStoreContext.Provider value={storeRef.current}>
      <CalendarInner {...props} />
    </CalendarStoreContext.Provider>
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
