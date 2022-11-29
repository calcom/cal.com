import React, { useEffect, useState } from "react";

import dayjs from "@calcom/dayjs";

import { useCalendarStore } from "../../state/store";

type Props = {
  containerNavRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  containerOffsetRef: React.RefObject<HTMLDivElement>;
};

export function CurrentTime({ containerOffsetRef }: Props) {
  const [currentTimePos, setCurrentTimePos] = useState<number>(0);
  const { startHour, endHour } = useCalendarStore((state) => ({
    startHour: state.startHour || 0,
    endHour: state.endHour || 23,
  }));

  useEffect(() => {
    // Set the container scroll position based on the current time.
    let currentMinute = new Date().getHours() * 60;
    currentMinute = currentMinute + new Date().getMinutes();

    if (containerOffsetRef.current) {
      const totalHours = endHour - startHour;
      const currentTimePos = currentMinute;
      setCurrentTimePos(currentTimePos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startHour, endHour]);

  return (
    <div
      className="absolute z-40 ml-3 flex h-1 items-center justify-center border-gray-800"
      aria-hidden="true"
      style={{ top: `calc(${currentTimePos}*var(--one-minute-height))`, zIndex: 100 }}>
      {dayjs().format("HH:mm")}
      <div className="ml-1 h-3 w-1 bg-gray-800" />
      <div className="h-1 w-full bg-gray-800" />
    </div>
  );
}
