import { NewScheduleButton } from "availabilitylist/NewScheduleButton";

import type { HttpError } from "@calcom/lib/http-error";
import { Clock } from "@calcom/ui/components/icon";

import { EmptyScreen } from "./EmptyScreen";
import { Availability } from "./ScheduleListItem";

export type Schedule = {
  isDefault: boolean;
  id: number;
  name: string;
  availability: {
    id: number;
    startTime: Date;
    endTime: Date;
    userId?: number;
    eventTypeId?: number;
    date?: Date;
    days: number[];
    scheduleId?: number;
  }[];
  timezone?: string;
};

export function AvailabilityList({
  schedules,
  onCreateMutation,
  updateMutation,
  duplicateMutation,
  deleteMutation,
}: {
  schedules: Schedule[] | [];
  onCreateMutation: (values: {
    onSucess: (schedule: Schedule) => void;
    onError: (err: HttpError) => void;
  }) => void;
  updateMutation: ({ scheduleId, isDefault }: { scheduleId: number; isDefault: boolean }) => void;
  duplicateMutation: ({ scheduleId }: { scheduleId: number }) => void;
  deleteMutation: ({ scheduleId }: { scheduleId: number }) => void;
}) {
  if (schedules.length === 0) {
    return (
      <div className="flex justify-center">
        <EmptyScreen
          Icon={Clock}
          headline="Create an availability schedule"
          subtitle="Creating availability schedules allows you to manage availability across event types. They can be applied to one or more event types."
          className="w-full"
          buttonRaw={<NewScheduleButton createMutation={onCreateMutation} />}
        />
      </div>
    );
  }

  return (
    <div className="border-subtle bg-default mb-16 overflow-hidden rounded-md border">
      <ul className="divide-subtle divide-y" data-testid="schedules">
        {schedules.map((schedule) => (
          <Availability
            key={schedule.id}
            schedule={schedule}
            isDeletable={schedules.length !== 1}
            updateDefault={updateMutation}
            deleteFunction={deleteMutation}
            duplicateFunction={duplicateMutation}
          />
        ))}
      </ul>
    </div>
  );
}
