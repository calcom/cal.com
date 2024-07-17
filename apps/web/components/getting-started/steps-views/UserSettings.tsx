import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { FULL_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { trpc } from "@calcom/trpc/react";
import { Button, TimezoneSelect, Icon, Input } from "@calcom/ui";

import { UsernameAvailabilityField } from "@components/ui/UsernameAvailability";

interface IUserSettingsProps {
  nextStep: () => void;
  hideUsername?: boolean;
}

const UserSettings = (props: IUserSettingsProps) => {
  const { nextStep } = props;
  const [user] = trpc.viewer.me.useSuspenseQuery();
  const { t } = useLocale();
  const { setTimezone: setSelectedTimeZone, timezone: selectedTimeZone } = useTimePreferences();
  const telemetry = useTelemetry();
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

  useEffect(() => {
    telemetry.event(telemetryEventTypes.onboardingStarted);
  }, [telemetry]);

  const utils = trpc.useUtils();
  const onSuccess = async () => {
    await utils.viewer.me.invalidate();
    nextStep();
  };
  const mutation = trpc.viewer.updateProfile.useMutation({
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
      <div className="space-y-6">
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
        type="submit"
        className="mt-8 flex w-full flex-row justify-center"
        loading={mutation.isPending}
        disabled={mutation.isPending}>
        {t("next_step_text")}
        <Icon name="arrow-right" className="ml-2 h-4 w-4 self-center" aria-hidden="true" />
      </Button>
    </form>
  );
};

export { UserSettings };
