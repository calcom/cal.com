import { ArrowRightIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc, TRPCClientErrorLike, UseTRPCMutationOptions } from "@calcom/trpc/react";
import { AppRouter } from "@calcom/trpc/server/routers/_app";
import { Form } from "@calcom/ui/form/fields";
import { Button } from "@calcom/ui/v2";

import { DEFAULT_SCHEDULE } from "@lib/availability";
import { Schedule as ScheduleType } from "@lib/types/schedule";

// import Schedule from "@components/availability/Schedule";
import Schedule from "@components/availability/v2/Schedule";

interface ISetupAvailabilityProps {
  nextStep: () => void;
  defaultScheduleId?: number | null;
  defaultAvailability?: any;
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
  console.log(availabilityForm.getValues());
  const mutationOptions: any = {
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
      className="mx-auto max-w-lg bg-white text-black dark:bg-opacity-5 dark:text-white"
      form={availabilityForm}
      handleSubmit={async (values) => {
        try {
          console.log({ defaultScheduleId, values });
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

      <div className="px-2">
        {/* <button
          type="submit"
          className={classNames(
            "my-4 flex w-full flex-row justify-center rounded-md border border-black bg-black p-2 text-center text-white",
            disabledNextButton ? "cursor-not-allowed opacity-20" : ""
          )}
          disabled={true}>
          Next Step
          <ArrowRightIcon className="ml-2 h-5 w-5 self-center" aria-hidden="true" />
        </button> */}
        <Button type="submit" className="my-4 w-full p-2" disabled={availabilityForm.formState.isSubmitting}>
          Next Step <ArrowRightIcon className="ml-2 h-5 w-5 self-center" aria-hidden="true" />
        </Button>
      </div>
    </Form>
  );
};

export { SetupAvailability };
