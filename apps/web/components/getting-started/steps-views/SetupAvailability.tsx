import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Schedule } from "@calcom/features/schedules";
import { DEFAULT_SCHEDULE } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { TRPCClientErrorLike } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import { Button, Form } from "@calcom/ui";
import { ArrowRight } from "@calcom/ui/components/icon";

interface ISetupAvailabilityProps {
  nextStep: () => void;
  defaultScheduleId?: number | null;
  onAvailabilityChanged: () => void;
}

const SetupAvailability = (props: ISetupAvailabilityProps) => {
  const { defaultScheduleId } = props;

  const { t } = useLocale();
  const { nextStep } = props;

  const scheduleId = defaultScheduleId === null ? undefined : defaultScheduleId;
  const queryAvailability = trpc.viewer.availability.schedule.get.useQuery(
    { scheduleId: defaultScheduleId ?? undefined },
    {
      enabled: !!scheduleId,
    }
  );

  const availabilityForm = useForm({
    defaultValues: {
      schedule: queryAvailability?.data?.availability || DEFAULT_SCHEDULE,
    },
  });

  const mutationOptions = {
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      throw new Error(error.message);
    },
    onSuccess: () => {
      nextStep();
    },
  };
  const createSchedule = trpc.viewer.availability.schedule.create.useMutation(mutationOptions);
  const updateSchedule = trpc.viewer.availability.schedule.update.useMutation(mutationOptions);

  const { watch } = availabilityForm;
  const mondayWatchedValue = watch("schedule.1");
  const mondayWatchedValueNestedFields = watch(["schedule.1.0", "schedule.1.1"]);
  const tuesdayWatchedValue = watch("schedule.2");
  const tuesdayWatchedValueNestedFields = watch(["schedule.2.0", "schedule.2.1"]);
  const wednesdayWatchedValue = watch("schedule.3");
  const wednesdayWatchedValueNestedFields = watch(["schedule.3.0", "schedule.3.1"]);
  const thursdayWatchedValue = watch("schedule.4");
  const thursdayWatchedValueNestedFields = watch(["schedule.4.0", "schedule.4.1"]);
  const fridayWatchedValue = watch("schedule.5");
  const fridayWatchedValueNestedFields = watch(["schedule.5.0", "schedule.5.1"]);
  const saturdayWatchedValue = watch("schedule.6");
  const saturdayWatchedValueNestedFields = watch(["schedule.6.0", "schedule.6.1"]);
  const sundayWatchedValue = watch("schedule.0");
  const sundayWatchedValueNestedFields = watch(["schedule.0.0", "schedule.0.1"]);

  useEffect(() => {
    const { onAvailabilityChanged } = props;
    onAvailabilityChanged(
      mondayWatchedValue,
      tuesdayWatchedValue,
      wednesdayWatchedValue,
      thursdayWatchedValue,
      fridayWatchedValue,
      saturdayWatchedValue,
      sundayWatchedValue
    );

    console.log(sundayWatchedValue);
  }, [
    mondayWatchedValueNestedFields,
    tuesdayWatchedValueNestedFields,
    wednesdayWatchedValueNestedFields,
    thursdayWatchedValueNestedFields,
    fridayWatchedValueNestedFields,
    saturdayWatchedValueNestedFields,
    sundayWatchedValueNestedFields,
  ]);

  return (
    <Form
      className="bg-default dark:text-inverted text-emphasis w-full [--cal-brand-accent:#fafafa] dark:bg-opacity-5"
      form={availabilityForm}
      handleSubmit={async (values) => {
        try {
          if (defaultScheduleId) {
            await updateSchedule.mutate({
              scheduleId: defaultScheduleId,
              name: t("default_schedule_name"),
              ...values,
            });
          } else {
            await createSchedule.mutate({
              name: t("default_schedule_name"),
              ...values,
            });
          }
        } catch (error) {
          if (error instanceof Error) {
            // setError(error);
            // @TODO: log error
          }
        }
      }}>
      <Schedule control={availabilityForm.control} name="schedule" weekStart={1} />

      <div>
        <Button
          data-testid="save-availability"
          type="submit"
          className="mt-2 w-full justify-center p-2 text-sm sm:mt-8"
          disabled={availabilityForm.formState.isSubmitting}>
          {t("next_step_text")} <ArrowRight className="ml-2 h-4 w-4 self-center" />
        </Button>
      </div>
    </Form>
  );
};

export { SetupAvailability };
