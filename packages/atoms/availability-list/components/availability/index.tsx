import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import type { Schedule } from "availability-list";
import { Controls } from "availability-list/components/controls";
import { Globe } from "lucide-react";
import { Fragment } from "react";

import { availabilityAsString } from "@calcom/lib/availability";

type AvailabilityProps = {
  schedule: Schedule;
  isDeletable: boolean;
  updateDefault: ({ scheduleId, isDefault }: { scheduleId: number; isDefault: boolean }) => void;
  duplicateFunction: ({ scheduleId }: { scheduleId: number }) => void;
  deleteFunction: ({ scheduleId }: { scheduleId: number }) => void;
  displayOptions?: {
    timeZone?: string;
    hour12?: boolean;
  };
};

export function Availability({
  schedule,
  isDeletable,
  displayOptions,
  updateDefault,
  duplicateFunction,
  deleteFunction,
}: AvailabilityProps) {
  const { toast } = useToast();

  function handleDelete() {
    if (!isDeletable) {
      toast({
        description: "You are required to have at least one schedule",
      });
    } else {
      deleteFunction({
        scheduleId: schedule.id,
      });
    }
  }

  function handleSetDefault() {
    updateDefault({
      scheduleId: schedule.id,
      isDefault: true,
    });
  }

  function handleDuplicate() {
    duplicateFunction({
      scheduleId: schedule.id,
    });
  }

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
                  <Fragment key={availability.id}>
                    {availabilityAsString(availability, {
                      hour12: displayOptions?.hour12,
                    })}
                    <br />
                  </Fragment>
                ))}
              {(schedule.timeZone || displayOptions?.timeZone) && (
                <p className="my-1 flex items-center first-letter:text-xs">
                  <Globe className="h-3.5 w-3.5" />
                  &nbsp;{schedule.timeZone ?? displayOptions?.timeZone}
                </p>
              )}
            </p>
          </a>
        </div>
        <Controls
          schedule={schedule}
          handleDelete={handleDelete}
          handleDuplicate={handleDuplicate}
          handleSetDefault={handleSetDefault}
        />
      </div>
    </li>
  );
}
