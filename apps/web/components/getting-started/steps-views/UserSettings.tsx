"use client";

import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { FULL_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Input } from "@calcom/ui/components/form";
import { TimezoneSelect } from "@calcom/web/modules/timezone/components/TimezoneSelect";
import { UsernameAvailabilityField } from "@components/ui/UsernameAvailability";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface IUserSettingsProps {
  nextStep: () => void;
  hideUsername?: boolean;
  user: RouterOutputs["viewer"]["me"]["get"];
}

const UserSettings = (props: IUserSettingsProps) => {
  const { nextStep, user } = props;
  const { t } = useLocale();
  const { setTimezone: setSelectedTimeZone, timezone: selectedTimeZone } = useTimePreferences();
  const userSettingsSchema = z.object({
    name: z
      .string()
      .min(1)
      .max(FULL_NAME_LENGTH_MAX_LIMIT, {
        message: t("max_limit_allowed_hint", { limit: FULL_NAME_LENGTH_MAX_LIMIT }),
      }),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof userSettingsSchema>>({
    defaultValues: {
      name: user?.name || "",
    },
    reValidateMode: "onChange",
    resolver: zodResolver(userSettingsSchema),
  });

  /*useEffect(() => {
    telemetry.event(telemetryEventTypes.onboardingStarted);
  }, [telemetry]);*/

  const utils = trpc.useUtils();
  const onSuccess = async () => {
    await utils.viewer.me.invalidate();
    nextStep();
  };
  const mutation = trpc.viewer.me.updateProfile.useMutation({
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
      <div className="stack-y-6">
        {/* Username textfield: when not coming from signup */}
        {!props.hideUsername && <UsernameAvailabilityField />}

        {/* Full name textfield */}
        <div className="w-full">
          <label htmlFor="name" className="text-default mb-2 block text-sm font-medium">
            {t("full_name")}
          </label>
          <Input
            {...register("name", {
              required: true,
            })}
            id="name"
            name="name"
            type="text"
            placeholder="John Doe"
            autoComplete="off"
            autoCorrect="off"
          />
          {errors.name && (
            <p data-testid="required" className="py-2 text-xs text-red-500">
              {errors.name.message}
            </p>
          )}
        </div>
        {/* Timezone select field */}
        <div className="w-full">
          <label htmlFor="timeZone" className="text-default block text-sm font-medium">
            {t("timezone")}
          </label>

          <TimezoneSelect
            id="timeZone"
            value={selectedTimeZone}
            onChange={({ value }) => setSelectedTimeZone(value)}
            className="mt-2 w-full rounded-md text-sm"
          />

          <p className="text-subtle mt-3 flex flex-row font-sans text-xs leading-tight">
            {t("current_time")} {dayjs().tz(selectedTimeZone).format("LT").toString().toLowerCase()}
          </p>
        </div>
      </div>
      <Button
        EndIcon="arrow-right"
        type="submit"
        className="mt-8 flex w-full flex-row justify-center"
        loading={mutation.isPending}
        data-testid="connect-calendar-button"
        disabled={mutation.isPending}>
        {t("connect_your_calendar")}
      </Button>
    </form>
  );
};

export { UserSettings };
