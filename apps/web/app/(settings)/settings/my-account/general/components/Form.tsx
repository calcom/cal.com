"use client";

import { useRouter } from "next/router";
import { useMemo, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { nameOfDay } from "@calcom/lib/weekday";
import { Button, Form, Label, Select, SettingsToggle, TimezoneSelect } from "@calcom/ui";

import { saveGeneralPage } from "../_actions";
import type { getGeneralData } from "../_fetchers";

export function GeneralForm({ user }: { user: Awaited<ReturnType<typeof getGeneralData>> }) {
  const [isPending, startTransition] = useTransition();

  const { t } = useLocale();
  const router = useRouter();
  const localeOptions = useMemo(() => {
    return (router.locales || []).map((locale) => ({
      value: locale,
      label: new Intl.DisplayNames(locale, { type: "language" }).of(locale) || "",
    }));
  }, [router.locales]);
  const timeFormatOptions = [
    { value: 12, label: t("12_hour") },
    { value: 24, label: t("24_hour") },
  ];
  const weekStartOptions = [
    { value: "Sunday", label: nameOfDay(user.locale, 0) },
    { value: "Monday", label: nameOfDay(user.locale, 1) },
    { value: "Tuesday", label: nameOfDay(user.locale, 2) },
    { value: "Wednesday", label: nameOfDay(user.locale, 3) },
    { value: "Thursday", label: nameOfDay(user.locale, 4) },
    { value: "Friday", label: nameOfDay(user.locale, 5) },
    { value: "Saturday", label: nameOfDay(user.locale, 6) },
  ];
  const formMethods = useForm({
    defaultValues: {
      locale: {
        value: user.locale || "",
        label: localeOptions.find((option) => option.value === user.locale)?.label || "",
      },
      timeZone: user.timeZone || "",
      timeFormat: {
        value: user.timeFormat || 12,
        label: timeFormatOptions.find((option) => option.value === user.timeFormat)?.label || 12,
      },
      weekStart: {
        value: user.weekStart,
        label: nameOfDay(user.locale, user.weekStart === "Sunday" ? 0 : 1),
      },
      allowDynamicBooking: user.allowDynamicBooking ?? true,
    },
  });
  const {
    formState: { isDirty, isSubmitting },
    reset,
    getValues,
    handleSubmit,
  } = formMethods;
  const isDisabled = isSubmitting || !isDirty;

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      saveGeneralPage({
        ...data,
        locale: data.locale.value,
        timeFormat: data.timeFormat.value,
        weekStart: data.weekStart.value,
      });
    });
  });

  return (
    <Form form={formMethods} handleSubmit={onSubmit}>
      <Controller
        name="locale"
        render={({ field: { value, onChange } }) => (
          <>
            <Label className="text-emphasis">
              <>{t("language")}</>
            </Label>
            <Select<{
              label: string;
              value: string;
            }>
              className="capitalize"
              options={localeOptions}
              value={value}
              onChange={onChange}
            />
          </>
        )}
      />
      <Controller
        name="timeZone"
        control={formMethods.control}
        render={({ field: { value } }) => (
          <>
            <Label className="text-emphasis mt-8">
              <>{t("timezone")}</>
            </Label>
            <TimezoneSelect
              id="timezone"
              value={value}
              onChange={(event) => {
                if (event) formMethods.setValue("timeZone", event.value, { shouldDirty: true });
              }}
            />
          </>
        )}
      />
      <Controller
        name="timeFormat"
        control={formMethods.control}
        render={({ field: { value } }) => (
          <>
            <Label className="text-emphasis mt-8">
              <>{t("time_format")}</>
            </Label>
            <Select
              value={value}
              options={timeFormatOptions}
              onChange={(event) => {
                if (event) formMethods.setValue("timeFormat", { ...event }, { shouldDirty: true });
              }}
            />
          </>
        )}
      />
      <div className="text-gray text-default mt-2 flex items-center text-sm">
        {t("timeformat_profile_hint")}
      </div>
      <Controller
        name="weekStart"
        control={formMethods.control}
        render={({ field: { value } }) => (
          <>
            <Label className="text-emphasis mt-8">
              <>{t("start_of_week")}</>
            </Label>
            <Select
              value={value}
              options={weekStartOptions}
              onChange={(event) => {
                if (event) formMethods.setValue("weekStart", { ...event }, { shouldDirty: true });
              }}
            />
          </>
        )}
      />
      <div className="mt-8">
        <Controller
          name="allowDynamicBooking"
          control={formMethods.control}
          render={() => (
            <SettingsToggle
              title={t("dynamic_booking")}
              description={t("allow_dynamic_booking")}
              checked={formMethods.getValues("allowDynamicBooking")}
              onCheckedChange={(checked) => {
                formMethods.setValue("allowDynamicBooking", checked, { shouldDirty: true });
              }}
            />
          )}
        />
      </div>
      <Button disabled={isDisabled} color="primary" type="submit" className="mt-8">
        <>{t("update")}</>
      </Button>
    </Form>
  );
}
