import dayjs, { Dayjs } from "@calcom/dayjs";

type LargeCalendarProps = {
  onDaySelect: (day: Dayjs) => void;
  onTimeSelect: (time: string) => void;
};

export const LargeCalendar = ({ onDaySelect, onTimeSelect }: LargeCalendarProps) => {
  return (
    <div className="flex h-full w-full items-center justify-center dark:text-white">
      Something big is coming...
      <br />
      <button
        className="underline"
        type="button"
        onClick={(ev) => {
          ev.preventDefault();
          onDaySelect(dayjs());
          onTimeSelect(dayjs().format());
        }}>
        Click this button to set date + time in one go just like the big thing that is coming here would do.
        :)
      </button>
    </div>
  );
};
