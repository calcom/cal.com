import { ArrowRightIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

import { Schedule } from "@calcom/features/schedules";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc, TRPCClientErrorLike } from "@calcom/trpc/react";
import { AppRouter } from "@calcom/trpc/server/routers/_app";
import { Form } from "@calcom/ui/form/fields";
import { Button } from "@calcom/ui/v2";

import { DEFAULT_SCHEDULE } from "@lib/availability";
import type { Schedule as ScheduleType } from "@lib/types/schedule";

interface ISetupAvailabilityProps {
  nextStep: () => void;
  defaultScheduleId?: number | null;
  defaultAvailability?: { schedule?: TimeRanges[][] };
}

interface ScheduleFormValues {
  schedule: ScheduleType;
}

const SetupAvailability = (props: ISetupAvailabilityProps) => {
  const { defaultScheduleId } = props;

  const { t } = useLocale();
  const { nextStep } = props;

  const router = useRouter();
  let queryAvailability;
  if (defaultScheduleId) {
    queryAvailability = trpc.useQuery(["viewer.availability.schedule", { scheduleId: defaultScheduleId }], {
      enabled: router.isReady,
    });
  }

  const availabilityForm = useForm({
    defaultValues: { schedule: queryAvailability?.data?.availability || DEFAULT_SCHEDULE },
  });

  const mutationOptions = {
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      throw new Error(error.message);
    },
    onSuccess: () => {
      nextStep();
    },
  };
  const createSchedule = trpc.useMutation("viewer.availability.schedule.create", mutationOptions);
  const updateSchedule = trpc.useMutation("viewer.availability.schedule.update", mutationOptions);
  return (
    <Form<ScheduleFormValues>
      className="w-full bg-white text-black dark:bg-opacity-5 dark:text-white"
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
      <Schedule />

      <div>
        <Button
          data-testid="save-availability"
          type="submit"
          className="my-6 w-full justify-center p-2 text-sm"
          disabled={availabilityForm.formState.isSubmitting}>
          {t("next_step_text")} <ArrowRightIcon className="ml-2 h-4 w-4 self-center" />
        </Button>
      </div>
    </Form>
  );
};

export { SetupAvailability };
