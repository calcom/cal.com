import {
  EventTypeAttendeeReminder,
  EventTypeAttendeeReminderMethod,
  EventTypeAttendeeReminderTimeUnit,
} from "@prisma/client";
import React, { FC } from "react";
import { Controller, SubmitHandler, useForm, useWatch } from "react-hook-form";
import Select from "react-select";

import { useLocale } from "@lib/hooks/useLocale";

import Button from "@components/ui/Button";

interface OptionTypeBase {
  label: string;
  value: EventTypeAttendeeReminderMethod | EventTypeAttendeeReminderTimeUnit;
}

interface Props {
  onSubmit: SubmitHandler<IFormInput>;
  onCancel: () => void;
  selectedAttendeeReminder?: EventTypeAttendeeReminder;
}

type IFormInput = EventTypeAttendeeReminder;

const AttendeeReminderTypeForm: FC<Props> = (props) => {
  const { t } = useLocale();
  const methodOptions: OptionTypeBase[] = [
    { value: EventTypeAttendeeReminderMethod.EMAIL, label: t("email") },
    { value: EventTypeAttendeeReminderMethod.SMS, label: t("SMS") },
  ];
  const timeUnitOptions: OptionTypeBase[] = [
    { value: EventTypeAttendeeReminderTimeUnit.MINUTE, label: t("minutes") },
    { value: EventTypeAttendeeReminderTimeUnit.HOUR, label: t("hours") },
    { value: EventTypeAttendeeReminderTimeUnit.DAY, label: t("days") },
  ];
  const { selectedAttendeeReminder } = props;
  const defaultValues = selectedAttendeeReminder || { type: methodOptions[0].value };
  const { register, control, handleSubmit } = useForm<IFormInput>({
    defaultValues,
  });
  const selectedMethod = useWatch({ name: "method", control });
  const selectedMethodOption = methodOptions.find((e) => selectedMethod === e.value)!;

  const selectedTimeUnit = useWatch({ name: "timeUnit", control });
  const selectedTimeUnitOption = timeUnitOptions.find((e) => selectedTimeUnit === e.value)!;

  const onCancel = () => {
    props.onCancel();
  };

  return (
    <form onSubmit={handleSubmit(props.onSubmit)}>
      <div className="mb-2">
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          {t("communication_method")}
        </label>
        <Controller
          name="method"
          control={control}
          render={({ field }) => (
            <Select
              id="type"
              defaultValue={selectedMethodOption}
              options={methodOptions}
              isSearchable={false}
              className="focus:border-primary-500 focus:ring-primary-500 mt-1 mb-2 block w-full min-w-0 flex-1 rounded-none rounded-r-md border-gray-300 sm:text-sm"
              onChange={(option) => option && field.onChange(option.value)}
              value={selectedMethodOption}
              onBlur={field.onBlur}
              name={field.name}
            />
          )}
        />
      </div>
      {/* TODO Align these vertically */}
      <label htmlFor="type" className="block text-sm font-medium text-gray-700">
        {t("when_to_send")}
      </label>
      <div className="middle mb-2 flex items-center justify-center text-sm">
        <input
          type="number"
          className="focus:border-primary-500 focus:ring-primary-500 block w-12 rounded-sm border-gray-300 shadow-sm [appearance:textfield] ltr:mr-2 rtl:ml-2 sm:text-sm"
          placeholder="30"
          defaultValue={selectedAttendeeReminder?.time}
          {...register("time", { required: true, valueAsNumber: true })}
        />
        <Controller
          name="timeUnit"
          control={control}
          render={({ field }) => (
            <Select
              id="timeUnit"
              defaultValue={selectedTimeUnitOption}
              options={timeUnitOptions}
              isSearchable={false}
              className="focus:border-primary-500 focus:ring-primary-500 mt-1 mb-2 block w-full min-w-0 flex-1 rounded-none rounded-r-md border-gray-300 sm:text-sm"
              onChange={(option) => option && field.onChange(option.value)}
              value={selectedTimeUnitOption}
              onBlur={field.onBlur}
              name={field.name}
            />
          )}
        />
      </div>
      <div className="mt-5 flex space-x-2 sm:mt-4">
        <Button onClick={onCancel} type="button" color="secondary" className="ltr:mr-2">
          {t("cancel")}
        </Button>
        <Button type="submit">{t("save")}</Button>
      </div>
    </form>
  );
};

export default AttendeeReminderTypeForm;
