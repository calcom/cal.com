"use client";

import { Avatar } from "@calid/features/ui/components/avatar";
import { Button } from "@calid/features/ui/components/button";
import { Form } from "@calid/features/ui/components/form/form";
import { EmailField, TextField } from "@calid/features/ui/components/input/input";
import { Label } from "@calid/features/ui/components/label";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { TimezoneSelect } from "@calcom/features/components/timezone-select";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { defaultLocaleOption, localeOptions } from "@calcom/lib/i18n";
import { nameOfDay } from "@calcom/lib/weekday";
import { Select } from "@calcom/ui/components/form";
import { ImageUploader } from "@calcom/ui/components/image-uploader";

export type AdminUserFormValues = {
  avatarUrl: string | null;
  name: string;
  username: string;
  email: string;
  bio: string | null;
  locale: string;
  timeZone: string;
  timeFormat: number;
  weekStart: string;
  role: string;
  identityProvider: string;
};

const identityProviderOptions = [
  { value: "GOOGLE", label: "GOOGLE" },
  { value: "CAL", label: "CAL" },
];

const roleOptions = [
  { value: "USER", label: "User" },
  { value: "ADMIN", label: "Admin" },
];

export const AdminUserForm = ({
  defaultValues,
  localeProp = "en",
  submitLabel = "Save",
  onSubmit,
}: {
  defaultValues?: Partial<AdminUserFormValues>;
  localeProp?: string;
  submitLabel?: string;
  onSubmit: (values: AdminUserFormValues) => void;
}) => {
  const { t } = useLocale();

  const timeFormatOptions = [
    { value: 12, label: t("12_hour") },
    { value: 24, label: t("24_hour") },
  ];

  const weekStartOptions = [
    { value: "Sunday", label: nameOfDay(localeProp, 0) },
    { value: "Monday", label: nameOfDay(localeProp, 1) },
    { value: "Tuesday", label: nameOfDay(localeProp, 2) },
    { value: "Wednesday", label: nameOfDay(localeProp, 3) },
    { value: "Thursday", label: nameOfDay(localeProp, 4) },
    { value: "Friday", label: nameOfDay(localeProp, 5) },
    { value: "Saturday", label: nameOfDay(localeProp, 6) },
  ];

  const resolvedLocale = defaultValues?.locale || defaultLocaleOption.value;

  const form = useForm<AdminUserFormValues>({
    defaultValues: {
      avatarUrl: defaultValues?.avatarUrl ?? null,
      name: defaultValues?.name ?? "",
      username: defaultValues?.username ?? "",
      email: defaultValues?.email ?? "",
      bio: defaultValues?.bio ?? "",
      locale: resolvedLocale,
      timeZone: defaultValues?.timeZone ?? "",
      timeFormat: defaultValues?.timeFormat ?? 12,
      weekStart: defaultValues?.weekStart ?? "Monday",
      role: defaultValues?.role ?? "USER",
      identityProvider: defaultValues?.identityProvider ?? "CAL",
    },
  });

  const baselineRef = useRef<AdminUserFormValues | null>(null);
  const watchedValues = useWatch({ control: form.control });

  const normalizeTimeZone = useCallback(
    (timeZone: string | null | undefined) => (timeZone || "").replace("Asia/Calcutta", "Asia/Kolkata"),
    []
  );

  const normalizeValues = useCallback(
    (values: Partial<AdminUserFormValues> | undefined) => ({
      avatarUrl: values?.avatarUrl ?? null,
      name: values?.name ?? "",
      username: values?.username ?? "",
      email: values?.email ?? "",
      bio: values?.bio ?? "",
      locale: values?.locale ?? resolvedLocale,
      timeZone: normalizeTimeZone(values?.timeZone),
      timeFormat: values?.timeFormat ?? 12,
      weekStart: values?.weekStart ?? "Monday",
      role: values?.role ?? "USER",
      identityProvider: values?.identityProvider ?? "CAL",
    }),
    [normalizeTimeZone, resolvedLocale]
  );

  useEffect(() => {
    const normalized = normalizeValues(defaultValues);
    baselineRef.current = normalized;
    form.reset(normalized);
  }, [defaultValues, form, normalizeValues]);

  const isDirty = useMemo(() => {
    const baseline = baselineRef.current;
    if (!baseline) return false;
    const current = normalizeValues(watchedValues);
    return (
      current.avatarUrl !== baseline.avatarUrl ||
      current.name !== baseline.name ||
      current.username !== baseline.username ||
      current.email !== baseline.email ||
      current.bio !== baseline.bio ||
      current.locale !== baseline.locale ||
      current.timeZone !== baseline.timeZone ||
      current.timeFormat !== baseline.timeFormat ||
      current.weekStart !== baseline.weekStart ||
      current.role !== baseline.role ||
      current.identityProvider !== baseline.identityProvider
    );
  }, [normalizeValues, watchedValues]);

  return (
    <Form form={form} className="space-y-4" onSubmit={onSubmit}>
      <div className="flex items-center">
        <Controller
          control={form.control}
          name="avatarUrl"
          render={({ field: { value, onChange } }) => (
            <>
              <Avatar
                alt={form.getValues("name") || ""}
                imageSrc={getUserAvatarUrl({ avatarUrl: value || undefined })}
                size="lg"
              />
              <div className="ml-4">
                <ImageUploader
                  target="avatar"
                  id="admin-avatar-upload"
                  buttonMsg="Change avatar"
                  handleAvatarChange={onChange}
                  imageSrc={getUserAvatarUrl({ avatarUrl: value || undefined })}
                />
              </div>
            </>
          )}
        />
      </div>

      <Controller
        control={form.control}
        name="role"
        render={({ field: { onChange, value } }) => (
          <div>
            <Label className="text-default font-medium" htmlFor="role">
              {t("role")}
            </Label>
            <Select
              value={roleOptions.find((opt) => opt.value === value)}
              options={roleOptions}
              onChange={(option) => onChange(option?.value ?? "USER")}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="identityProvider"
        render={({ field: { onChange, value } }) => (
          <div>
            <Label className="text-default font-medium" htmlFor="identityProvider">
              {t("identity_provider")}
            </Label>
            <Select
              value={identityProviderOptions.find((opt) => opt.value === value)}
              options={identityProviderOptions}
              onChange={(option) => onChange(option?.value ?? "CAL")}
            />
          </div>
        )}
      />

      <TextField label={t("name")} placeholder="example" required {...form.register("name")} />
      <TextField label={t("username")} placeholder="example" required {...form.register("username")} />
      <EmailField label={t("email")} placeholder="user@example.com" required {...form.register("email")} />
      <TextField label={t("about")} {...form.register("bio")} />

      <Controller
        control={form.control}
        name="locale"
        render={({ field: { onChange, value } }) => (
          <div>
            <Label className="text-default">{t("language")}</Label>
            <Select
              className="capitalize"
              options={localeOptions}
              value={localeOptions.find((option) => option.value === value)}
              onChange={(option) => onChange(option?.value ?? defaultLocaleOption.value)}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="timeZone"
        render={({ field: { value } }) => (
          <div>
            <Label className="text-default mt-8">{t("timezone")}</Label>
            <TimezoneSelect
              id="timezone"
              value={value}
              onChange={(event) => {
                const nextValue = event?.value ?? "";
                const baseline = baselineRef.current?.timeZone ?? "";
                form.setValue("timeZone", nextValue, { shouldDirty: nextValue !== baseline });
              }}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="timeFormat"
        render={({ field: { value, onChange } }) => (
          <div>
            <Label className="text-default mt-8">{t("time_format")}</Label>
            <Select
              value={timeFormatOptions.find((opt) => opt.value === value)}
              options={timeFormatOptions}
              onChange={(option) => onChange(option?.value ?? 12)}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="weekStart"
        render={({ field: { value, onChange } }) => (
          <div>
            <Label className="text-default mt-8">{t("start_of_week")}</Label>
            <Select
              value={weekStartOptions.find((opt) => opt.value === value)}
              options={weekStartOptions}
              onChange={(option) => onChange(option?.value ?? "Monday")}
            />
          </div>
        )}
      />

      <Button type="submit" color="primary" disabled={!isDirty}>
        {submitLabel}
      </Button>
    </Form>
  );
};
