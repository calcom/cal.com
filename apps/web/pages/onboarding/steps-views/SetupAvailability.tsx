import { ArrowRightIcon } from "@heroicons/react/solid";
import { useForm } from "react-hook-form";

import classNames from "@calcom/lib/classNames";
import { Form } from "@calcom/ui/form/fields";

import { DEFAULT_SCHEDULE } from "@lib/availability";
import { Schedule as ScheduleType } from "@lib/types/schedule";

import Schedule from "@components/availability/Schedule";

interface ISetupAvailabilityProps {
  nextStep: () => void;
}

interface ScheduleFormValues {
  schedule: ScheduleType;
}

const SetupAvailability = (props: ISetupAvailabilityProps) => {
  const { nextStep } = props;
  const availabilityForm = useForm({ defaultValues: { schedule: DEFAULT_SCHEDULE } });
  const disabledNextButton = false;
  return (
    <Form<ScheduleFormValues>
      className="mx-auto max-w-lg bg-white text-black dark:bg-opacity-5 dark:text-white"
      form={availabilityForm}
      handleSubmit={async (values) => {
        // try {
        //   setSubmitting(true);
        //   await createSchedule.mutate({
        //     name: t("default_schedule_name"),
        //     ...values,
        //   });
        //   debouncedHandleConfirmStep();
        //   setSubmitting(false);
        // } catch (error) {
        //   if (error instanceof Error) {
        //     setError(error);
        //   }
        // }
      }}>
      <Schedule name="schedule" />
      <button
        type="button"
        className={classNames(
          "mt-8 flex w-full flex-row justify-center rounded-md border border-black bg-black p-2 text-center text-white",
          disabledNextButton ? "cursor-not-allowed opacity-20" : ""
        )}
        onClick={() => nextStep()}
        disabled={disabledNextButton}>
        Next Step
        <ArrowRightIcon className="ml-2 h-5 w-5 self-center" aria-hidden="true" />
      </button>
    </Form>
  );
};

export { SetupAvailability };
