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
import { Logo } from "@calcom/ui/components/logo";

import { OnboardingContinuationPrompt } from "../../components/onboarding-continuation-prompt";
import { useOnboardingStore } from "../../store/onboarding-store";

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
    <div className="bg-default flex min-h-screen w-full flex-col items-start overflow-clip rounded-xl">
      <OnboardingContinuationPrompt />
      {/* Header */}
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Logo className="h-5 w-auto" />

        {/* Progress dots - centered */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-1">
          <div className="bg-emphasis h-1.5 w-1.5 rounded-full" />
          <div className="bg-subtle h-1 w-1 rounded-full" />
          <div className="bg-subtle h-1 w-1 rounded-full" />
          <div className="bg-subtle h-1 w-1 rounded-full" />
        </div>

        <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-2">
          <p className="text-emphasis text-sm font-medium leading-none">{userEmail}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex h-full w-full items-start justify-center px-6 py-8">
        <div className="flex w-full max-w-[600px] flex-col gap-6">
          {/* Card */}
          <div className="bg-muted border-muted relative rounded-xl border p-1">
            <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
              {/* Card Header */}
              <div className="flex w-full gap-1.5 px-5 py-4">
                <div className="flex w-full flex-col gap-1">
                  <h1 className="font-cal text-xl font-semibold leading-6">{t("welcome_to_cal_com")}</h1>
                  <p className="text-subtle text-sm font-medium leading-tight">
                    {t("personal_settings_subtitle")}
                  </p>
                </div>
              </div>

              {/* Form */}
              <div className="bg-default border-muted w-full rounded-[10px] border">
                <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
                  <div className="flex w-full flex-col items-start">
                    <div className="flex w-full gap-6 px-5 py-5">
                      <div className="flex w-full flex-col gap-4 rounded-xl">
                        {/* Name */}
                        <div className="flex w-full flex-col gap-1.5">
                          <Label className="text-emphasis text-sm font-medium leading-4">{t("full_name")}</Label>
                          <TextField
                            {...form.register("name")}
                            value={name}
                            onChange={(e) => {
                              setName(e.target.value);
                              form.setValue("name", e.target.value);
                            }}
                            placeholder="John Doe"
                            className="border-default h-7 rounded-[10px] border px-2 py-1.5 text-sm"
                          />
                          {form.formState.errors.name && (
                            <p className="text-error text-sm">{form.formState.errors.name.message}</p>
                          )}
                        </div>

                        {/* Timezone */}
                        <div className="flex w-full flex-col gap-1.5">
                          <Label className="text-emphasis text-sm font-medium leading-4">{t("timezone")}</Label>
                          <TimezoneSelect
                            value={selectedTimeZone}
                            onChange={({ value }) => setSelectedTimeZone(value)}
                            className="rounded-[10px] text-sm"
                          />
                          <p className="text-subtle text-xs font-normal leading-3">
                            {t("current_time")} {dayjs().tz(selectedTimeZone).format("LT").toString().toLowerCase()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex w-full items-center justify-end gap-1 px-5 py-4">
                <Button
                  color="primary"
                  className="rounded-[10px]"
                  onClick={handleContinue}
                  loading={mutation.isPending}
                  disabled={mutation.isPending || !form.formState.isValid}>
                  {t("continue")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
