import { Button } from "@calid/features/ui/components/button";
import { useForm } from "react-hook-form";

import Schedule from "@calcom/features/schedules/components/Schedule";
import { DEFAULT_SCHEDULE } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/types/server/routers/_app";
import { Form } from "@calcom/ui/components/form";

import type { TRPCClientErrorLike } from "@trpc/client";

interface ISetupAvailabilityProps {
  nextStep: () => void;
  defaultScheduleId?: number | null;
}

const SetupAvailability = (props: ISetupAvailabilityProps) => {
  const { defaultScheduleId } = props;

  const updateProfileMutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async (_data, _context) => {
      nextStep();
    },
    onError: () => {
      showToast(t("problem_saving_user_profile"), "error");
    },
  });

  const handleNextStep = () => {
    updateProfileMutation.mutate({
      metadata: {
        currentOnboardingStep: "user-profile",
      },
    });
  };

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
      handleNextStep();
      nextStep();
    },
  };
  const createSchedule = trpc.viewer.availability.schedule.create.useMutation(mutationOptions);
  const updateSchedule = trpc.viewer.availability.schedule.update.useMutation(mutationOptions);
  return (
    <Form
      form={availabilityForm}
      handleSubmit={async (values) => {
        try {
          if (defaultScheduleId) {
            await updateSchedule.mutateAsync({
              scheduleId: defaultScheduleId,
              name: t("default_schedule_name"),
              ...values,
            });
          } else {
            await createSchedule.mutateAsync({
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
      <div className="bg-default dark:text-inverted text-emphasis border-subtle w-full rounded-md border dark:bg-opacity-5">
        <Schedule control={availabilityForm.control} name="schedule" weekStart={1} />
      </div>

      <div>
        <Button
          color="primary"
          EndIcon="arrow-right"
          data-testid="save-availability"
          type="submit"
          className="mt-2 w-full justify-center p-2 text-sm sm:mt-8"
          loading={availabilityForm.formState.isSubmitting}
          disabled={availabilityForm.formState.isSubmitting}>
          {t("next_step_text")}
        </Button>
      </div>
    </Form>
  );
};

export { SetupAvailability };
