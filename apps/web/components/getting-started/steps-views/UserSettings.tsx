"use client";

import { Button } from "@calid/features/ui/components/button";
import { Input } from "@calid/features/ui/components/input/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { TimezoneSelect } from "@calcom/features/components/timezone-select";
import { FULL_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import { designationTypes, professionTypeAndEventTypes, customEvents } from "@calcom/lib/customEvents";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTelemetry } from "@calcom/lib/hooks/useTelemetry";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { telemetryEventTypes } from "@calcom/lib/telemetry";
import { trpc } from "@calcom/trpc/react";
import { Select } from "@calcom/ui/components/form";

import { UsernameAvailabilityField } from "@components/ui/UsernameAvailability";

interface IUserSettingsProps {
  nextStep: () => void;
  hideUsername?: boolean;
}

const UserSettings = (props: IUserSettingsProps) => {
  const { nextStep } = props;
  const [user] = trpc.viewer.me.get.useSuspenseQuery();
  const { t } = useLocale();
  const { setTimezone: setSelectedTimeZone, timezone: selectedTimeZone } = useTimePreferences();
  const telemetry = useTelemetry();
  const userSettingsSchema = z.object({
    username: z.string().min(1, { message: t("username_required") }),
    name: z
      .string()
      .min(1)
      .max(FULL_NAME_LENGTH_MAX_LIMIT, {
        message: t("max_limit_allowed_hint", { limit: FULL_NAME_LENGTH_MAX_LIMIT }),
      }),
  });

  const defaultValues = {
    username: user?.username || "",
    name: user?.name || "",
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<z.infer<typeof userSettingsSchema>>({
    defaultValues: defaultValues,
    reValidateMode: "onChange",
    resolver: zodResolver(userSettingsSchema),
  });

  useEffect(() => {
    telemetry.event(telemetryEventTypes.onboardingStarted);
  }, [telemetry]);

  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(
    (isPrismaObjOrUndefined(user.metadata) as { designation?: string })?.designation || "founder"
  );

  const designationTypeOptions: { value: string; label: string }[] = Object.keys(designationTypes).map(
    (key) => ({
      value: key,
      label: designationTypes[key],
    })
  );
  const { data: eventTypes } = trpc.viewer.eventTypes.list.useQuery();
  const createEventType = trpc.viewer.eventTypes.calid_create.useMutation();
  const utils = trpc.useUtils();
  const onSuccess = async () => {
    if (eventTypes?.length === 0 && selectedBusiness !== null) {
      await Promise.all(
        professionTypeAndEventTypes[selectedBusiness].map(async (event, i): Promise<void> => {
          const reverseIndex = professionTypeAndEventTypes[selectedBusiness].length - i - 1;
          const eventType = {
            ...event,
            title: customEvents[event.title],
            description: customEvents[event.description as string],
            position: reverseIndex,
            length: (event.length as number[])[0],
            metadata: {
              multipleDuration: event.length as number[],
            },
          };

          return createEventType.mutate(eventType);
        })
      );
    }

    await utils.viewer.me.invalidate();
    nextStep();
  };
  const mutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: onSuccess,
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({
      metadata: {
        currentOnboardingStep: "connected-calendar",
      },
      name: data.name,
      username: data.username,
      timeZone: selectedTimeZone,
    });
  });

  return (
    <form onSubmit={onSubmit} className=" space-y-6">
      {!props.hideUsername && (
        <div>
          <UsernameAvailabilityField control={control} />
          {errors.username && (
            <p data-testid="username-required" className="mt-1 text-xs text-red-500">
              {errors.username.message}
            </p>
          )}
        </div>
      )}

      {/* Full name textfield */}
      <div className="w-full ">
        <label htmlFor="name" className="text-emphasis block text-sm font-medium">
          {t("full_name")} *
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
          className="focus:ring-brand-default w-full focus:border-none focus:ring-2"
        />
        {errors.name && (
          <p data-testid="required" className="mt-1 text-xs text-red-500">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Designation select field */}
      <div className="w-full">
        <label htmlFor="business_type" className="text-default block text-sm font-medium">
          {t("business_type")}
        </label>
        <Select
          value={designationTypeOptions.find((option) => option.value === selectedBusiness) || null}
          onChange={(option: { value: string; label: string } | null) => {
            setSelectedBusiness(option?.value || "");
          }}
          options={designationTypeOptions}
          placeholder={t("business_type")}
          className="w-full text-sm capitalize"
        />
      </div>

      {/* Timezone select field */}
      <div className="w-full">
        <label htmlFor="timeZone" className="text-emphasis block text-sm font-medium">
          {t("timezone")}
        </label>

        <TimezoneSelect
          id="timeZone"
          value={selectedTimeZone}
          onChange={({ value }) => setSelectedTimeZone(value)}
          className="w-full"
        />

        <p className="text-subtle mt-2 text-xs">
          {t("current_time")} {dayjs().tz(selectedTimeZone).format("LT").toString().toLowerCase()}
        </p>
      </div>

      <Button
        EndIcon="arrow-right"
        type="submit"
        className="bg-active border-active dark:border-default mt-8 w-full justify-center dark:bg-gray-200"
        loading={mutation.isPending}
        disabled={mutation.isPending}>
        {t("next_step_text")}
      </Button>
    </form>
  );
};

export { UserSettings };
