"use client";
import { usePhoneNumberField, PhoneNumberField } from "@calid/features/ui/components/input/phone-number-field";
import { PHONE_NUMBER_VERIFICATION_ENABLED } from "@calcom/lib/constants";

import { Button } from "@calid/features/ui/components/button";
import { Input } from "@calid/features/ui/components/input/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@calid/features/ui/components/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { showToast } from "@calcom/ui/toast";

import { UsernameAvailabilityField } from "@components/ui/UsernameAvailability";

interface IUserSettingsProps {
  nextStep: () => void;
  hideUsername?: boolean;
  isPhoneFieldMandatory: boolean;
}

const UserSettings = (props: IUserSettingsProps) => {
  const { nextStep, isPhoneFieldMandatory } = props;
  const [user] = trpc.viewer.me.get.useSuspenseQuery();
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
    metadata: z.object({
      phoneNumber: isPhoneFieldMandatory
        ? z
            .string()
            .min(1, { message: t("phone_number_required") })
            .refine(
              (val) => {
                return isValidPhoneNumber(val);
              },
              { message: t("invalid_phone_number") }
            )
        : z.string().refine(
            (val) => {
              return val === "" || isValidPhoneNumber(val);
            },
            { message: t("invalid_phone_number") }
          ),
    }),
  });

  const defaultValues = {
    name: user?.name || "",
    metadata: {
      phoneNumber: (isPrismaObjOrUndefined(user.metadata)?.phoneNumber as string) ?? "",
    },
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    control,
  } = useForm<z.infer<typeof userSettingsSchema>>({
    defaultValues: defaultValues,
    reValidateMode: "onChange",
    resolver: zodResolver(userSettingsSchema),
  });

  const watchedPhoneNumber = useWatch({
    control,
    name: "metadata.phoneNumber",
  });

  useEffect(() => {
    telemetry.event(telemetryEventTypes.onboardingStarted);
  }, [telemetry]);

  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);

  const designationTypeOptions: { value: string; label: string }[] = Object.keys(designationTypes).map(
    (key) => ({
      value: key,
      label: designationTypes[key],
    })
  );
  const { data: eventTypes } = trpc.viewer.eventTypes.list.useQuery();
  const createEventType = trpc.viewer.eventTypes.create.useMutation();
  const utils = trpc.useUtils();
  const onSuccess = async () => {
    if (eventTypes?.length === 0 && selectedBusiness !== null) {
      await Promise.all(
        professionTypeAndEventTypes[selectedBusiness].map(async (event): Promise<void> => {
          const eventType = {
            ...event,
            title: customEvents[event.title],
            description: customEvents[event.description as string],
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
  const { getValue: getPhoneValue, setValue: setPhoneValue } = usePhoneNumberField(
    { getValues, setValue },
    defaultValues,
    "metadata.phoneNumber"
  );

  console.log("isPhoneFieldMandatory: ", isPhoneFieldMandatory);

  const onSubmit = handleSubmit((data) => {
    if (
      isPhoneFieldMandatory &&
      data.metadata.phoneNumber &&
      (PHONE_NUMBER_VERIFICATION_ENABLED ? !numberVerified : false)
    ) {
      showToast(t("phone_verification_required"), "error");
      return;
    }

    mutation.mutate({
      metadata: {
        currentOnboardingStep: "connected-calendar",
        phoneNumber: data.metadata.phoneNumber,
      },
      name: data.name,
      timeZone: selectedTimeZone,
    });
  });

  const handlePhoneDelete = () => {
    mutation.mutate({
      metadata: {
        currentOnboardingStep: "connected-calendar",
      },
      name: getValues("name"),
      timeZone: selectedTimeZone,
    });
  };

  return (
    <form onSubmit={onSubmit} className=" space-y-6">
      {/* Username textfield: when not coming from signup */}
      {!props.hideUsername && <UsernameAvailabilityField />}

      {/* Full name textfield */}
      <div className="w-full ">
        <label htmlFor="name" className="text-emphasis block text-sm font-medium">
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
          className="w-full"
        />
        {errors.name && (
          <p data-testid="required" className="mt-1 text-xs text-red-500">
            {errors.name.message}
          </p>
        )}
      </div>
      <PhoneNumberField
        getValue={getPhoneValue}
        setValue={setPhoneValue}
        getValues={getValues}
        defaultValues={defaultValues}
        isRequired={isPhoneFieldMandatory}
        allowDelete={!isPhoneFieldMandatory && defaultValues?.metadata?.phoneNumber !== ""}
        hasExistingNumber={defaultValues?.metadata?.phoneNumber !== ""}
        errorMessage={errors.metadata?.phoneNumber?.message}
        onDeleteNumber={handlePhoneDelete}
        isNumberVerificationRequired={PHONE_NUMBER_VERIFICATION_ENABLED} // Only require OTP when phone is mandatory
      />

      {/* Designation select field */}
      <div className="w-full">
        <label htmlFor="business_type" className="text-default block text-sm font-medium">
          {t("business_type")}
        </label>
        <Select
          onValueChange={(value) => {
            setSelectedBusiness(value);
          }}
          defaultValue={user?.metadata?.designation || designationTypeOptions[0].value}>
          <SelectTrigger className="mt-2 w-full text-sm capitalize">
            <SelectValue placeholder={t("business_type")} />
          </SelectTrigger>
          <SelectContent className="bg-default max-h-60 overflow-y-auto">
            {designationTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        className="mt-8 w-full justify-center"
        loading={mutation.isPending}
        disabled={mutation.isPending}>
        {t("next_step_text")}
      </Button>
    </form>
  );
};

export { UserSettings };
