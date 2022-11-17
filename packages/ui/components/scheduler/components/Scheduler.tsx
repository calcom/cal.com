import React, { useEffect, useMemo, useRef } from "react";

import { useSchedulerStore } from "../state/store";
import "../styles/styles.css";
import { SchedulerComponentProps } from "../types/state";
import { getDaysBetweenDates, getHoursToDisplay } from "../utils";
import { DateValues } from "./DateValues/DateValues";
import { BlockedList } from "./blocking/BlockedList";
import { EmptyCell } from "./event/Empty";
import { EventList } from "./event/EventList";
import { SchedulerHeading } from "./heading/SchedulerHeading";
import { HorizontalLines } from "./horizontalLines";
import { VeritcalLines } from "./verticalLines";

export function Scheduler(props: SchedulerComponentProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const containerNav = useRef<HTMLDivElement | null>(null);
  const containerOffset = useRef<HTMLDivElement | null>(null);
  const initalState = useSchedulerStore((state) => state.initState);

  const { startDate, endDate, startHour, endHour, usersCellsStopsPerHour, eventHoverDuration } =
    useSchedulerStore((state) => ({
      startDate: state.startDate,
      endDate: state.endDate,
      startHour: state.startHour || 0,
      endHour: state.endHour || 23,
      usersCellsStopsPerHour: state.gridCellsPerHour || 4,
      eventHoverDuration: state.hoverEventDuration,
    }));

  const days = useMemo(() => getDaysBetweenDates(startDate, endDate), [startDate, endDate]);

  const hours = useMemo(() => getHoursToDisplay(startHour || 0, endHour || 23), [startHour, endHour]);

  const numberOfGridStopsPerDay = hours.length * usersCellsStopsPerHour;

  // Initalise State on inital mount
  useEffect(() => {
    initalState(props);
  }, [props, initalState]);

  return (
    <div
      className="scheduler-wrapper flex h-full w-full flex-col overflow-y-scroll"
      data-gridstopsperhour={usersCellsStopsPerHour}>
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
                className="scheduler-grid-row-template scheduler-grid-column-template z-50 col-start-1 col-end-2 row-start-1 grid sm:pr-8"
                data-gridstopsperday={numberOfGridStopsPerDay}>
                <>
                  {[...Array(days.length)].map((_, i) => (
                    <li
                      key={i}
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
                            eventDuration={eventHoverDuration || 15}
                          />
                        );
                      })}
                    </li>
                  ))}
                </>
              </ol>
              <ol
                className="scheduler-grid-row-template scheduler-grid-column-template relative col-start-1 col-end-2 row-start-1 grid  sm:pr-8"
                data-gridstopsperday={numberOfGridStopsPerDay}>
                {/*Loop over events per day  */}
                {days.map((day, i) => {
                  return (
                    <li
                      key={day.toISOString()}
                      className="relative"
                      style={{ gridColumnStart: i + 1, marginTop: containerOffset.current?.offsetHeight }}>
                      <EventList day={day} />
                      {/* We mayaswell add blocked in here too  */}
                      <BlockedList day={day} containerRef={container} />
                    </li>
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
