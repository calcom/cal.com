import { useEffect, useState, useRef } from "react";

import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";

import { useCalendarStore } from "../../state/store";

export function CurrentTime() {
  const currentTimeRef = useRef<HTMLDivElement>(null);
  const [scrolledIntoView, setScrolledIntoView] = useState(false);
  const [currentTimePos, setCurrentTimePos] = useState<number | null>(null);
  const { startHour, endHour } = useCalendarStore((state) => ({
    startHour: state.startHour || 0,
    endHour: state.endHour || 23,
  }));
  const { timeFormat } = useTimePreferences();

  useEffect(() => {
    // Set the container scroll position based on the current time.
    const currentHour = new Date().getHours();
    let currentMinute = new Date().getHours() * 60;
    currentMinute = currentMinute + new Date().getMinutes();

    if (currentHour > endHour || currentHour < startHour) {
      setCurrentTimePos(null);
    }

    const minutesFromStart = currentMinute - startHour * 60;
    setCurrentTimePos(minutesFromStart);

    if (!currentTimeRef.current || scrolledIntoView) return;
    // Within a small timeout so element has time to render.
    setTimeout(() => {
      currentTimeRef?.current?.scrollIntoView({ block: "center" });
      setScrolledIntoView(true);
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startHour, endHour, scrolledIntoView]);

  return (
    <div
      ref={currentTimeRef}
      className="absolute top-0 z-40 flex h-px items-center justify-center text-xs"
      aria-hidden="true"
      style={{
        top: `calc(${currentTimePos}*var(--one-minute-height) + var(--calendar-offset-top))`,
        zIndex: 70,
      }}>
      <div className="w-14 pr-2 text-right">{dayjs().format(timeFormat)}</div>
      <div className="bg-inverted h-3 w-px" />
      <div className="bg-inverted h-px w-screen" />
    </div>
  );
}
