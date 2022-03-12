import {
  EventTypeAttendeeReminder,
  EventTypeAttendeeReminderUnitTime,
  EventTypeAttendeeReminderMethod,
} from "@prisma/client";
import React, { FC } from "react";
import { Controller, SubmitHandler, useForm, useWatch } from "react-hook-form";
import Select from "react-select";

import { useLocale } from "@lib/hooks/useLocale";

import Button from "@components/ui/Button";

interface OptionTypeBase {
  label: string;
  value: EventTypeAttendeeReminderMethod | EventTypeAttendeeReminderUnitTime;
}

interface Props {
  onSubmit: SubmitHandler<IFormInput>;
  onCancel: () => void;
  selectedAttendeeReminder?: EventTypeAttendeeReminder;
}

type IFormInput = EventTypeAttendeeReminder;

const CustomInputTypeForm: FC<Props> = (props) => {
  const { t } = useLocale();
  const methodOptions: OptionTypeBase[] = [
    { value: EventTypeAttendeeReminderMethod.SMS, label: t("sms").toUpperCase() },
    { value: EventTypeAttendeeReminderMethod.EMAIL, label: t("email").toUpperCase() },
  ];
  const unitTimeOptions: OptionTypeBase[] = [
    { value: EventTypeAttendeeReminderUnitTime.DAY, label: t("day").toUpperCase() },
    { value: EventTypeAttendeeReminderUnitTime.HOUR, label: t("hours").toUpperCase() },
    { value: EventTypeAttendeeReminderUnitTime.MINUTE, label: t("minutes").toUpperCase() },
  ];
  const { selectedAttendeeReminder } = props;
  const defaultValues = selectedAttendeeReminder || { type: unitTimeOptions[0].value };
  const { register, control, handleSubmit } = useForm<IFormInput>({
    defaultValues,
  });

  const selectedMethod = useWatch({ name: "method", control });
  const selectedMethodOption = methodOptions.find((e) => selectedMethod === e.value)!;
  const selectedUnitTime = useWatch({ name: "unitTime", control });
  const selectedUnitTimeOption = unitTimeOptions.find((e) => selectedUnitTime === e.value)!;

  const onCancel = () => {
    props.onCancel();
  };

  return (
    <form onSubmit={handleSubmit(props.onSubmit)}>
      <div className="mb-2">
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          {t("method")}
        </label>
        <Controller
          name="method"
          control={control}
          render={({ field }) => (
            <Select
              id="method"
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
      <div className="mb-2">
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          {t("when_to_send")}
        </label>
        <div className="inline-flex w-full space-x-2 ltr:ml-2 rtl:mr-2 rtl:space-x-reverse">
          <input
            type="number"
            className="focus:border-primary-500 focus:ring-primary-500 block w-12 rounded-sm border-gray-300 shadow-sm [appearance:textfield] ltr:mr-2 rtl:ml-2 sm:text-sm"
            placeholder="30"
            defaultValue={selectedAttendeeReminder?.time}
            {...register("time")}
          />
          <select
            id=""
            className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-sm border-gray-300 py-2 pl-3 pr-10 text-base focus:outline-none sm:text-sm"
            {...register("unitTime")}
            defaultValue={selectedAttendeeReminder?.unitTime}>
            {unitTimeOptions.map((unitTime) => (
              <option key={unitTime.value} value={unitTime.value}>
                {unitTime.label}
              </option>
            ))}
          </select>
          <span className="w-full">{t("send_before")}</span>
        </div>
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

export default CustomInputTypeForm;
