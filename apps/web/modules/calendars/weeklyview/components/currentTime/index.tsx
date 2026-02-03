import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { useCalendarStore } from "@calcom/features/calendars/weeklyview/state/store";
import { useCallback, useEffect, useRef, useState } from "react";

function calculateMinutesFromStart(startHour: number, currentHour: number, currentMinute: number) {
  const startMinute = startHour * 60;
  const currentMinuteOfDay = currentHour * 60 + currentMinute;
  return currentMinuteOfDay - startMinute;
}

export function CurrentTime({
  timezone,
  scrollToCurrentTime = true,
  updateOnFocus = false,
}: {
  timezone: string;
  scrollToCurrentTime?: boolean;
  updateOnFocus?: boolean;
}) {
  const { timeFormat } = useTimePreferences();
  const currentTimeRef = useRef<HTMLDivElement>(null);
  const [scrolledIntoView, setScrolledIntoView] = useState(false);
  const [currentTimePos, setCurrentTimePos] = useState<number | null>(null);
  const { startHour, endHour } = useCalendarStore((state) => ({
    startHour: state.startHour || 0,
    endHour: state.endHour || 23,
  }));

  const updateCurrentTimePosition = useCallback(() => {
    const currentDateTime = dayjs().tz(timezone);
    const currentHour = currentDateTime.hour();
    const currentMinute = currentDateTime.minute();

    if (currentHour > endHour || currentHour < startHour) {
      setCurrentTimePos(null);
      return;
    }

    const minutesFromStart = calculateMinutesFromStart(startHour, currentHour, currentMinute);
    setCurrentTimePos(minutesFromStart);
  }, [timezone, startHour, endHour]);

  useEffect(() => {
    updateCurrentTimePosition();

    if (!scrollToCurrentTime || !currentTimeRef.current || scrolledIntoView) return;
    setTimeout(() => {
      currentTimeRef?.current?.scrollIntoView({ block: "center" });
      setScrolledIntoView(true);
    }, 100);
  }, [updateCurrentTimePosition, scrolledIntoView, scrollToCurrentTime]);

  useEffect(() => {
    if (!updateOnFocus) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateCurrentTimePosition();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [updateOnFocus, updateCurrentTimePosition]);

  return (
    <div
      ref={currentTimeRef}
      className="absolute top-0 z-40 flex h-px items-center justify-center text-xs"
      aria-hidden="true"
      style={{
        top: `calc(${currentTimePos}*var(--one-minute-height) + var(--calendar-offset-top))`,
        zIndex: 70,
      }}>
      <div className="w-16 pr-2 text-right">{dayjs().tz(timezone).format(timeFormat)}</div>
      <div className="bg-inverted h-3 w-px" />
      <div className="bg-inverted h-px w-screen" />
    </div>
  );
}
