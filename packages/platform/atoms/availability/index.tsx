import { useClientSchedule } from "availability/hooks/useClientSchedule";
import { useProfileInfo } from "availability/hooks/useProfileInfo";
import { useForm, Controller } from "react-hook-form";

import Shell from "@calcom/features/shell/Shell";
import { availabilityAsString } from "@calcom/lib/availability";
import { SkeletonText } from "@calcom/ui";

import EditableHeading from "@components/ui/EditableHeading";

import { useApiKey } from "../cal-provider";

type AvailabilityProps = {
  id?: string;
};

export function Availability({ id }: AvailabilityProps) {
  const { key, error } = useApiKey();
  // if user doesnt provide a scheduleId we use the default schedule id
  // since we know there will always be one default schedule so schedule cant be empty
  const { isLoading, data: schedule } = useClientSchedule(id ? id : "1", key);
  const user = useProfileInfo(key);

  const { timeFormat } = user.data || { timeFormat: null };

  const form = useForm({
    values: schedule && {
      ...schedule,
      schedule: schedule?.availability || [],
    },
  });

  if (error === "no_key") return <>You havent entered a key</>;

  if (error === "invalid_key") return <>This is not a valid key, please enter a valid key</>;

  if (isLoading) return <>Loading...</>;

  return (
    <Shell
      title={schedule?.name ? `${schedule.name} | Availability` : "Availability"}
      heading={
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => (
            <EditableHeading isReady={!isLoading} {...field} data-testid="availablity-title" />
          )}
        />
      }
      subtitle={
        schedule ? (
          schedule.schedule
            .filter((availability: any) => !!availability.days.length)
            .map((availability: any) => (
              <span key={availability.id}>
                {availabilityAsString(availability, { hour12: timeFormat === 12 })}
                <br />
              </span>
            ))
        ) : (
          <SkeletonText className="h-4 w-48" />
        )
      }
    />
  );
}
