import { useId } from "react";

import { useTimePreferences } from "@calcom/features/bookings/lib";

export const HorizontalLines = ({
  startHour,
  endHour,
  numberOfGridStopsPerCell,
  containerOffsetRef,
}: {
  startHour: number;
  endHour: number;
  numberOfGridStopsPerCell: number;
  containerOffsetRef: React.RefObject<HTMLDivElement>;
}) => {
  const { timeFormat } = useTimePreferences();
  const id = useId();

  const generateTimeSlots = () => {
    const slots = [];
    const minutesPerSlot = 60 / numberOfGridStopsPerCell;
    const totalSlots = (endHour - startHour) * numberOfGridStopsPerCell;

    for (let i = 0; i <= totalSlots; i++) {
      const hour = Math.floor(i / numberOfGridStopsPerCell) + startHour;
      const minute = (i % numberOfGridStopsPerCell) * minutesPerSlot;
      slots.push({ hour, minute });
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <div
      className="divide-default pointer-events-none relative z-[60] col-start-1 col-end-2 row-start-1 grid divide-y"
      style={{
        gridTemplateRows: `repeat(${timeSlots.length - 1}, minmax(var(--gridDefaultSize),1fr)`,
      }}>
      <div className="row-end-1 h-[--calendar-offset-top]" ref={containerOffsetRef} />
      {timeSlots.map((slot, index) => (
        <div key={`${id}-${index}`} className="relative">
          <div className="text-muted absolute left-0 top-0 z-20 -ml-14 flex h-full w-14 items-center justify-end pr-2 text-xs leading-5 rtl:-mr-14">
            {`${String(slot.hour).padStart(2, "0")}:${String(slot.minute).padStart(2, "0")}`}
          </div>
        </div>
      ))}
    </div>
  );
};
