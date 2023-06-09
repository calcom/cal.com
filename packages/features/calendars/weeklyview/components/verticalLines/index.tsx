import type dayjs from "@calcom/dayjs";

export const VeritcalLines = ({ days }: { days: dayjs.Dayjs[] }) => {
  return (
    <div
      className="divide-default pointer-events-none relative z-[60] col-start-1 col-end-2 row-start-1 grid
       auto-cols-auto grid-rows-1 divide-x sm:pr-8">
      {days.map((_, i) => (
        <div
          key={`Key_vertical_${i}`}
          className="row-span-full"
          style={{
            gridColumnStart: i + 1,
          }}
        />
      ))}
    </div>
  );
};
