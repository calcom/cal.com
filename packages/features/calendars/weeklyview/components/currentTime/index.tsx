import { useEffect, useState, useRef } from "react";

import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";

import { useCalendarStore } from "../../state/store";

function calculateMinutesFromStart(startHour: number, currentHour: number, currentMinute: number) {
  const startMinute = startHour * 60;
  const currentMinuteOfDay = currentHour * 60 + currentMinute;
  return currentMinuteOfDay - startMinute;
}

export function CurrentTime() {
  const currentTimeRef = useRef<HTMLDivElement>(null);
  const [scrolledIntoView, setScrolledIntoView] = useState(false);
  const [currentTimePos, setCurrentTimePos] = useState<number | null>(null);
  const { startHour, endHour } = useCalendarStore((state) => ({
    startHour: state.startHour || 0,
    endHour: state.endHour || 23,
  }));
  const { timeFormat, timezone } = useTimePreferences();

  useEffect(() => {
    // Set the container scroll position based on the current time.

    const currentDateTime = dayjs().tz(timezone); // Get current date and time in the specified timezone

    const currentHour = currentDateTime.hour();
    const currentMinute = currentDateTime.minute();

    if (currentHour > endHour || currentHour < startHour) {
      setCurrentTimePos(null);
    }

    const minutesFromStart = calculateMinutesFromStart(startHour, currentHour, currentMinute);
    setCurrentTimePos(minutesFromStart);

    if (!currentTimeRef.current || scrolledIntoView) return;
    // Within a small timeout so element has time to render.
    setTimeout(() => {
      // eslint-disable-next-line @calcom/eslint/no-scroll-into-view-embed -- Does't seem to cause any issue. Put it under condition if needed
      currentTimeRef?.current?.scrollIntoView({ block: "center" });
      setScrolledIntoView(true);
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startHour, endHour, scrolledIntoView, timezone]);

  return (
    <div
      ref={currentTimeRef}
      className="absolute top-0 z-40 flex h-px items-center justify-center text-xs"
      aria-hidden="true"
      style={{
        top: `calc(${currentTimePos}*var(--one-minute-height) + var(--calendar-offset-top))`,
        zIndex: 70,
      }}>
      <div className="w-14 pr-2 text-right">{dayjs().tz(timezone).format(timeFormat)}</div>
      <div className="bg-inverted h-3 w-px" />
      <div className="bg-inverted h-px w-screen" />
    </div>
  );
}
