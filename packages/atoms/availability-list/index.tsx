import { NewScheduleButton } from "availability-list/components/new-schedule-button";
import { useApiKey } from "cal-provider";
import { useEffect, useState } from "react";

import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import { Clock } from "@calcom/ui/components/icon";

import { Availability } from "./components/availability";
import { EmptyScreen } from "./components/empty-screen";

export type Schedule = {
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
  timeZone: string | null;
};

export function AvailabilityList() {
  const key = useApiKey();
  const utils = trpc.useContext();
  const [isKeyPresent, setIsKeyPresent] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[] | []>([]);

  const updateMutation = trpc.viewer.availability.schedule.update.useMutation({
    onSuccess: async ({ schedule }) => {
      await utils.viewer.availability.list.invalidate();
      // show success toast
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        // show error toast
        // showToast(message, "error");
      }
    },
  });

  const deleteMutation = trpc.viewer.availability.schedule.delete.useMutation({
    onMutate: async ({ scheduleId }) => {
      await utils.viewer.availability.list.cancel();
      const previousValue = utils.viewer.availability.list.getData();
      if (previousValue) {
        const filteredValue = previousValue.schedules.filter(({ id }) => id !== scheduleId);
        utils.viewer.availability.list.setData(undefined, { ...previousValue, schedules: filteredValue });
      }

      return { previousValue };
    },

    onError: (err, variables, context) => {
      if (context?.previousValue) {
        utils.viewer.availability.list.setData(undefined, context.previousValue);
      }
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        // Show error message toast here
        //showToast(message, "error");
      }
    },
    onSettled: () => {
      utils.viewer.availability.list.invalidate();
    },
    onSuccess: () => {
      // Show success toast here
      // showToast(t("schedule_deleted_successfully"), "success");
    },
  });

  const duplicateMutation = trpc.viewer.availability.schedule.duplicate.useMutation({
    onSuccess: async ({ schedule }) => {
      // router.push to schedule
      // then show success toast
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        // showToast(message, "error");
        // show error toast
      }
    },
  });

  useEffect(() => {
    async function getSchedules(key: string) {
      // here we're supposed call the /schedules endpoint in v2 to get schedules
      // since v2 is not ready yet thats why calling localhost for now
      const response = await fetch(`/v2/schedules?apiKey=${key}`);
      const data = await response.json();

      setSchedules(data);
    }

    if (key !== "no_key" && key !== "invalid_key") {
      setIsKeyPresent(true);
      getSchedules(key);
    }
  }, [key]);

  if (key === "no_key") {
    return <>You havent entered a key</>;
  }

  if (key === "invalid_key") {
    return <>This is not a valid key, please enter a valid key</>;
  }

  if (isKeyPresent && schedules.length === 0) {
    return (
      <div className="flex justify-center">
        <EmptyScreen
          Icon={Clock}
          headline="Create an availability schedule"
          description="Creating availability schedules allows you to manage availability across event types. They can be applied to one or more event types."
          className="w-full"
          buttonRaw={<NewScheduleButton />}
        />
      </div>
    );
  }

  if (isKeyPresent && !!schedules) {
    return (
      <div className="border-subtle bg-default mb-16 overflow-hidden rounded-md border">
        <ul className="divide-subtle divide-y" data-testid="schedules">
          {schedules.map((schedule) => (
            <Availability
              key={schedule.id}
              schedule={schedule}
              isDeletable={schedules.length !== 1}
              updateDefault={updateMutation.mutate}
              deleteFunction={deleteMutation.mutate}
              duplicateFunction={duplicateMutation.mutate}
            />
          ))}
        </ul>
      </div>
    );
  }
}
