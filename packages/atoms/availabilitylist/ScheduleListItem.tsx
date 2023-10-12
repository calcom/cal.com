import { Badge } from "@/components/ui/badge";

type Schedule = {
  isDefault: boolean;
  id: number;
  name: string;
  availability: {
    id: number;
    startTime: Date;
    endTime: Date;
    userId: number | null;
    eventTypeId: number | null;
    date: Date | null;
    days: number[];
    scheduleId: number | null;
  }[];
  timezone: string | null;
};

export function ScheduleListItem({
  schedule,
  isDeletable,
  displayOptions,
}: {
  schedule: Schedule;
  isDeletable: boolean;
  displayOptions?: {
    timeZone?: string;
    hour12?: boolean;
  };
}) {
  return (
    <li key={schedule.id}>
      <div className="hover:bg-muted flex items-center justify-between py-5 ltr:pl-4 rtl:pr-4 sm:ltr:pl-0 sm:rtl:pr-0">
        <div className="group flex w-full items-center justify-between sm:px-6">
          <a className="flex-grow truncate text-sm" href={`/availability/${schedule.id}`}>
            <h1>{schedule.name}</h1>
            <div className="space-x-2 rtl:space-x-reverse">
              {schedule.isDefault && <Badge className="bg-success text-success text-xs">Default</Badge>}
            </div>
            <p className="text-subtle mt-1">
              {schedule.availability
                .filter((availability) => !!availability.days.length)
                .map((availability) => (
                  <h1 key={availability.id}>Return fragment here</h1>
                ))}
              {(schedule.timeZone || displayOptions?.timeZone) && (
                <p className="my-1 flex items-center first-letter:text-xs">
                  Display globe here &nbsp;{schedule.timeZone ?? displayOptions?.timeZone}
                </p>
              )}
            </p>
          </a>
        </div>
      </div>
    </li>
  );
}
