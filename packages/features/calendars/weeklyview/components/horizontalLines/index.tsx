import { useId } from "react";

import type dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";

export const HorizontalLines = ({
  hours,
  numberOfGridStopsPerCell,
  containerOffsetRef,
}: {
  hours: dayjs.Dayjs[];
  numberOfGridStopsPerCell: number;
  containerOffsetRef: React.RefObject<HTMLDivElement>;
}) => {
  const { timeFormat } = useTimePreferences();
  const finalHour = hours[hours.length - 1].add(1, "hour").minute(0).format(timeFormat);
  const id = useId();

  return (
    <div
      className="divide-default pointer-events-none relative z-[60] col-start-1 col-end-2 row-start-1 grid divide-y"
      style={{
        gridTemplateRows: `repeat(${hours.length}, minmax(var(--gridDefaultSize),1fr)`,
      }}>
      <div className="row-end-1 h-[--calendar-offset-top]" ref={containerOffsetRef} />
      {hours.map((hour) => (
        <div key={`${id}-${hour.get("hour")}`} className="relative">
          <div className="text-muted absolute left-0 top-0 z-20 -ml-14 flex h-full w-14 items-center justify-end pr-2 text-xs leading-5 rtl:-mr-14">
            {hour.minute(0).format(timeFormat)}
          </div>
        </div>
      ))}
      <div key={`${id}-${finalHour}`} className="relative">
        <div className="text-muted absolute left-0 top-0 z-20 -ml-14 flex h-full w-14 items-center justify-end pr-2 text-xs leading-5 rtl:-mr-14">
          {finalHour}
        </div>
      </div>
    </div>
  );
};
