import { ArrowRightIcon } from "@heroicons/react/outline";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { User } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import TimezoneSelect from "@calcom/ui/form/TimezoneSelect";

import { UsernameAvailability } from "@components/ui/UsernameAvailability";

interface IUserSettingsProps {
  user: User;
  nextStep: () => void;
}

const UserSettings = (props: IUserSettingsProps) => {
  const { user, nextStep } = props;
  const { t } = useLocale();
  const [selectedTimeZone, setSelectedTimeZone] = useState(user.timeZone ?? dayjs.tz.guess());
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm({
    defaultValues: {
      name: user?.name || "",
      username: user?.username || "",
    },
    reValidateMode: "onChange",
  });
  const defaultOptions = { required: true, maxLength: 255 };

  const utils = trpc.useContext();
  const onSuccess = async () => {
    await utils.viewer.me.invalidate();
    nextStep();
  };
  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: onSuccess,
  });
  const { data: stripeCustomer } = trpc.viewer.stripeCustomer.useQuery();
  const paymentRequired = stripeCustomer?.isPremium ? !stripeCustomer?.paidForPremium : false;
  const onSubmit = handleSubmit((data) => {
    if (paymentRequired) {
      return;
    }
    mutation.mutate({
      name: data.name,
      timeZone: selectedTimeZone,
    });
  });

  const [currentUsername, setCurrentUsername] = useState(user.username || "");

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-6">
        {/* Username textfield */}
        <Controller
          control={control}
          name="username"
          render={({ field: { value, ref, onChange } }) => (
            <UsernameAvailability
              readonly={true}
              currentUsername={currentUsername}
              setCurrentUsername={setCurrentUsername}
              inputUsernameValue={value}
              usernameRef={ref}
              setInputUsernameValue={onChange}
              user={user}
            />
          )}
        />

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
          {errors.name && (
            <p data-testid="required" className="py-2 text-xs text-red-500">
              {t("required")}
            </p>
          )}
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
            className="mt-2 w-full rounded-md text-sm"
          />

          <p className="mt-3 flex flex-row font-sans text-xs leading-tight text-gray-500 dark:text-white">
            {t("current_time")} {dayjs().tz(selectedTimeZone).format("LT").toString().toLowerCase()}
          </p>
        </div>
      </div>
      <Button
        type="submit"
        className="mt-8 flex w-full flex-row justify-center"
        disabled={mutation.isLoading}>
        {t("next_step_text")}
        <ArrowRightIcon className="ml-2 h-4 w-4 self-center" aria-hidden="true" />
      </Button>
    </form>
  );
};

export { UserSettings };
