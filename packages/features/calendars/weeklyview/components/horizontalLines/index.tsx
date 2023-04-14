import { useId } from "react";

import type dayjs from "@calcom/dayjs";

export const HorizontalLines = ({
  hours,
  numberOfGridStopsPerCell,
  containerOffsetRef,
}: {
  hours: dayjs.Dayjs[];
  numberOfGridStopsPerCell: number;
  containerOffsetRef: React.RefObject<HTMLDivElement>;
}) => {
  const finalHour = hours[hours.length - 1].add(1, "hour").format("h A");
  const id = useId();
  return (
    <div
      className=" divide-subtle col-start-1 col-end-2 row-start-1 grid divide-y"
      style={{
        gridTemplateRows: `repeat(${hours.length}, minmax(${1.75 * numberOfGridStopsPerCell}rem,1fr)`,
      }}>
      <div className="row-end-1 h-7 " ref={containerOffsetRef} />
      {hours.map((hour) => (
        <>
          <div key={`${id}-${hour.get("hour")}`}>
            <div className="text-muted sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5">
              {hour.format("h A")}
            </div>
          </div>
        </>
      ))}
      <div key={`${id}-${finalHour}`}>
        <div className="text-muted sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs leading-5">
          {finalHour}
        </div>
      </div>
    </div>
  );
};
