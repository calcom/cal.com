import React, { useEffect, useState } from "react";

import dayjs from "@calcom/dayjs";

import { useSchedulerStore } from "../../state/store";

type Props = {
  containerNavRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  containerOffsetRef: React.RefObject<HTMLDivElement>;
};

export function CurrentTime({ containerNavRef, containerOffsetRef, containerRef }: Props) {
  const [currentTimePos, setCurrentTimePos] = useState<number | null>(null);
  const { startHour, endHour } = useSchedulerStore((state) => ({
    startHour: state.startHour || 0,
    endHour: state.endHour || 23,
  }));

  useEffect(() => {
    // Set the container scroll position based on the current time.
    const currentMinute = new Date().getHours() * 60;

    if (containerRef.current && containerNavRef.current && containerOffsetRef.current) {
      const totalHours = endHour - startHour;
      const offset =
        containerRef.current.scrollHeight -
        containerNavRef.current.offsetHeight -
        containerOffsetRef.current.offsetHeight;

      const currentTimePos = (offset * currentMinute) / (totalHours * 60);
      setCurrentTimePos(currentTimePos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startHour, endHour]);

  return (
    <div
      className="relative z-40 ml-3 flex h-1 items-center justify-center border-gray-800"
      style={{ top: currentTimePos || 0 }}>
      {dayjs().format("HH:mm")}
      <div className="ml-1 h-3 w-1 bg-gray-800" />
      <div className="h-1 w-full bg-gray-800" />
    </div>
  );
}
