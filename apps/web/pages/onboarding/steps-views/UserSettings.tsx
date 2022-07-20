import { ArrowRightIcon, ClockIcon } from "@heroicons/react/outline";
import { useTranslation } from "next-i18next";
import { useState } from "react";
import { useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { User } from "@calcom/prisma/client";

import { trpc } from "@lib/trpc";

import TimezoneSelect from "@components/ui/form/TimezoneSelect";

interface IUserSettingsProps {
  user: User;
  nextStep: () => void;
}

type FormData = {
  name: string;
};

const UserSettings = (props: IUserSettingsProps) => {
  const { user, nextStep } = props;
  const { t } = useTranslation();
  const [selectedTimeZone, setSelectedTimeZone] = useState(user.timeZone ?? dayjs.tz.guess());
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: user?.name || undefined,
    },
  });
  const defaultOptions = { required: true, maxLength: 255 };

  const utils = trpc.useContext();
  const onSuccess = async () => {
    await utils.invalidateQueries(["viewer.me"]);
    nextStep();
  };
  const mutation = trpc.useMutation("viewer.updateProfile", {
    onSuccess: onSuccess,
  });
  const onSubmit = handleSubmit((data) => {
    mutation.mutate({
      name: data.name,
      timeZone: selectedTimeZone,
    });
  });

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-4">
        {/* Full name textfield */}
        <div className="w-full">
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
            {t("full_name")}
          </label>
          <input
            {...register("name", defaultOptions)}
            id="name"
            name="name"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            className="w-full rounded-md border border-gray-300 text-sm"
          />
          {errors.name?.type === "required" && <p className="mt-1 text-xs">Full name is required</p>}
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
            className="text-s mt-2 w-full rounded-md border border-gray-300"
          />

          <p className="font-inter mt-3 flex flex-row text-xs leading-tight text-gray-500 dark:text-white">
            <ClockIcon className="mr-1 h-[14px] w-[14px] self-center text-gray-500" />
            {t("current") + " " + t("timezone").toLocaleLowerCase()}&nbsp;
            {dayjs().tz(selectedTimeZone).format("LT").toString()}
          </p>
        </div>
      </div>
      <button
        type="submit"
        className="mt-11 flex w-full flex-row justify-center rounded-md border border-black bg-black p-2 text-center text-white">
        Next Step
        <ArrowRightIcon className="ml-2 h-5 w-5 self-center" aria-hidden="true" />
      </button>
    </form>
  );
};

export { UserSettings };
