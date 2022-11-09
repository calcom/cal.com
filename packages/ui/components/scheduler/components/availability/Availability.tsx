import { classNames } from "@calcom/lib";

type EventProps = {
  eventDuration: number;
};

export function Availability({ eventDuration }: EventProps) {
  return (
    <a
      className={classNames(
        "group absolute inset-1 flex h-full flex-col overflow-y-auto rounded-[4px]  bg-gray-900 py-1 px-[6px] text-xs  font-semibold leading-5 hover:cursor-not-allowed"
      )}>
      {eventDuration} minutes
    </a>
  );
}
