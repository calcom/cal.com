"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { TimezoneSelect } from "@calcom/features/components/timezone-select";
import { FULL_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Label, TextField } from "@calcom/ui/components/form";

import { OnboardingContinuationPrompt } from "../../components/onboarding-continuation-prompt";
import { useOnboardingStore } from "../../store/onboarding-store";
import { OnboardingCard } from "../_components/OnboardingCard";
import { OnboardingLayout } from "../_components/OnboardingLayout";

type PersonalSettingsViewProps = {
  userEmail: string;
  userName?: string;
};

export const PersonalSettingsView = ({ userEmail, userName }: PersonalSettingsViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const { personalDetails, setPersonalDetails } = useOnboardingStore();
  const { setTimezone: setSelectedTimeZone, timezone: selectedTimeZone } = useTimePreferences();

  const [name, setName] = useState("");

  useEffect(() => {
    setName(personalDetails.name || userName || "");
    if (personalDetails.timezone) {
      setSelectedTimeZone(personalDetails.timezone);
    }
  }, [personalDetails, userName, setSelectedTimeZone]);

  const formSchema = z.object({
    name: z
      .string()
      .min(1, t("name_required"))
      .max(FULL_NAME_LENGTH_MAX_LIMIT, {
        message: t("max_limit_allowed_hint", { limit: FULL_NAME_LENGTH_MAX_LIMIT }),
      }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: personalDetails.name || userName || "",
    },
  });

  const utils = trpc.useUtils();
  const mutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.viewer.me.invalidate();
    },
  });

  const handleContinue = form.handleSubmit(async (data) => {
    // Save to store
    setPersonalDetails({
      name: data.name,
      timezone: selectedTimeZone,
    });

    // Save to backend
    await mutation.mutateAsync({
      name: data.name,
      timeZone: selectedTimeZone,
    });

    router.push("/onboarding/personal/profile");
  });

  return (
    <>
      <OnboardingContinuationPrompt />
      <OnboardingLayout userEmail={userEmail} currentStep={1}>
        <OnboardingCard
          title={t("welcome_to_cal_com")}
          subtitle={t("personal_settings_subtitle")}
          footer={
            <Button
              color="primary"
              className="rounded-[10px]"
              onClick={handleContinue}
              loading={mutation.isPending}
              disabled={mutation.isPending || !form.formState.isValid}>
              {t("continue")}
            </Button>
          }>
          {/* Form */}
          <div className="bg-default border-muted w-full rounded-[10px] border">
            <div className="rounded-inherit flex w-full flex-col items-start">
              <div className="flex w-full flex-col items-start">
                <div className="flex w-full gap-6 px-5 py-5">
                  <div className="flex w-full flex-col gap-4 rounded-xl">
                    {/* Name */}
                    <div className="flex w-full flex-col gap-1.5">
                      <TextField
                        label={t("full_name")}
                        {...form.register("name")}
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          form.setValue("name", e.target.value);
                        }}
                        placeholder="John Doe"
                      />
                      {form.formState.errors.name && (
                        <p className="text-error text-sm">{form.formState.errors.name.message}</p>
                      )}
                    </div>

                    {/* Timezone */}
                    <div className="flex w-full flex-col gap-1.5">
                      <Label className="text-emphasis mb-0 text-sm font-medium leading-4">
                        {t("timezone")}
                      </Label>
                      <TimezoneSelect
                        value={selectedTimeZone}
                        onChange={({ value }) => setSelectedTimeZone(value)}
                      />
                      <p className="text-subtle text-xs font-normal leading-3">
                        {t("current_time")}{" "}
                        {dayjs().tz(selectedTimeZone).format("LT").toString().toLowerCase()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </OnboardingCard>
      </OnboardingLayout>
    </>
  );
};
