import { ArrowRightIcon, ClockIcon } from "@heroicons/react/outline";
import { useTranslation } from "next-i18next";
import { useState } from "react";
import { useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { User } from "@calcom/prisma/client";

import TimezoneSelect from "@components/ui/form/TimezoneSelect";

interface IUserSettingsProps {
  user: User;
}

const UserSettings = (props: IUserSettingsProps) => {
  const { t } = useTranslation();
  const [selectedTimeZone, setSelectedTimeZone] = useState(props.user.timeZone ?? dayjs.tz.guess());
  const { register, handleSubmit } = useForm();
  const defaultOptions = { required: true, maxLength: 255 };
  const onSubmit = (data: any) => {
    console.log(data);
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        {/* Username textfield */}
        <div className="w-full">
          <label htmlFor="username" className="mb-2 block text-sm font-medium text-gray-700">
            {t("username")}
          </label>
          <input
            {...register("username")}
            type="text"
            name="username"
            id="username"
            className="border-1 w-full rounded-md border-gray-300 text-sm"
          />
        </div>
        {/* Full name textfield */}
        <div className="w-full">
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
            {t("full_name")}
          </label>
          <input
            {...register("full_name", defaultOptions)}
            id="name"
            type="text"
            name="name"
            className="border-1 w-full rounded-md border-gray-300 text-sm"
          />
        </div>
        {/* Timezone select field */}
        <div className="w-full">
          <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
            {t("timezone")}
          </label>

          <TimezoneSelect
            id="timeZone"
            value={selectedTimeZone}
            onChange={({ value }) => setSelectedTimeZone(value)}
            className="border-1 text-s mt-2 w-full rounded-md border-gray-300"
          />

          <p className="mt-3 flex flex-row text-sm leading-tight text-gray-500 dark:text-white">
            <ClockIcon className="mr-1 h-4 w-4 self-center text-gray-600" />
            {t("current_time")}zone:&nbsp;
            {dayjs().tz(selectedTimeZone).format("LT")}
          </p>
        </div>
      </div>
      <button
        type="submit"
        className="mt-11 flex w-full flex-row justify-center rounded-md border-2 border-black bg-black p-2 text-center text-white">
        Next Step
        <ArrowRightIcon className="ml-2 h-5 w-5 self-center" aria-hidden="true" />
      </button>
    </form>
  );
};

export { UserSettings };
