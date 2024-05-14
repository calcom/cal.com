// eslint-disable-next-line no-restricted-imports
import { noop } from "lodash";
import { Controller, useForm } from "react-hook-form";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localeOptions } from "@calcom/lib/i18n";
import { nameOfDay } from "@calcom/lib/weekday";
import {
  Avatar,
  Button,
  EmailField,
  Form,
  ImageUploader,
  Label,
  Select,
  TextField,
  TimezoneSelect,
} from "@calcom/ui";

import type { UserAdminRouterOutputs } from "../server/trpc-router";

type User = UserAdminRouterOutputs["get"]["user"];

type Option<T extends string | number = string> = {
  value: T;
  label: string;
};

type OptionValues = {
  locale: Option;
  timeFormat: Option<number>;
  timeZone: string;
  weekStart: Option;
  role: Option;
  identityProvider: Option;
};

type FormValues = Pick<User, "avatarUrl" | "name" | "username" | "email" | "bio"> & OptionValues;

export const UserForm = ({
  defaultValues,
  localeProp = "en",
  onSubmit = noop,
  submitLabel = "save",
}: {
  defaultValues?: Pick<User, keyof FormValues>;
  localeProp?: string;
  onSubmit: (data: FormValues) => void;
  submitLabel?: string;
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

  const userRoleOptions = [
    { value: "USER", label: t("user") },
    { value: "ADMIN", label: t("admin") },
  ];

  const identityProviderOptions = [
    { value: "CAL", label: "CAL" },
    { value: "GOOGLE", label: "GOOGLE" },
    { value: "SAML", label: "SAML" },
  ];
  const defaultLocale = defaultValues?.locale || localeOptions[0].value;

  const form = useForm<FormValues>({
    defaultValues: {
      avatarUrl: defaultValues?.avatarUrl,
      name: defaultValues?.name,
      username: defaultValues?.username,
      email: defaultValues?.email,
      bio: defaultValues?.bio,
      locale: {
        value: defaultLocale,
        label: new Intl.DisplayNames(defaultLocale, { type: "language" }).of(defaultLocale) || "",
      },
      timeFormat: {
        value: defaultValues?.timeFormat || 12,
        label: timeFormatOptions.find((option) => option.value === defaultValues?.timeFormat)?.label || "12",
      },
      timeZone: defaultValues?.timeZone || "",
      weekStart: {
        value: defaultValues?.weekStart || weekStartOptions[0].value,
        label: nameOfDay(localeProp, defaultValues?.weekStart === "Sunday" ? 0 : 1),
      },
      role: {
        value: defaultValues?.role || userRoleOptions[0].value,
        label:
          userRoleOptions.find((option) => option.value === defaultValues?.role)?.label ||
          userRoleOptions[0].label,
      },
      identityProvider: {
        value: defaultValues?.identityProvider || identityProviderOptions[0].value,
        label:
          identityProviderOptions.find((option) => option.value === defaultValues?.identityProvider)?.label ||
          identityProviderOptions[0].label,
      },
    },
  });

  return (
    <Form form={form} className="space-y-4" handleSubmit={onSubmit}>
      <div className="flex items-center">
        <Controller
          control={form.control}
          name="avatarUrl"
          render={({ field: { value, onChange } }) => (
            <>
              <Avatar
                alt={form.getValues("name") || ""}
                imageSrc={getUserAvatarUrl({
                  avatarUrl: value,
                })}
                size="lg"
              />
              <div className="ml-4">
                <ImageUploader
                  target="avatar"
                  id="avatar-upload"
                  buttonMsg="Change avatar"
                  handleAvatarChange={onChange}
                  imageSrc={getUserAvatarUrl({
                    avatarUrl: value,
                  })}
                />
              </div>
            </>
          )}
        />
      </div>
      <Controller
        name="role"
        control={form.control}
        render={({ field: { onChange, value } }) => (
          <div>
            <Label className="text-default font-medium" htmlFor="role">
              {t("role")}
            </Label>
            <Select<{ label: string; value: string }>
              value={value}
              options={userRoleOptions}
              onChange={onChange}
            />
          </div>
        )}
      />
      <Controller
        name="identityProvider"
        control={form.control}
        render={({ field: { onChange, value } }) => (
          <div>
            <Label className="text-default font-medium" htmlFor="identityProvider">
              {t("identity_provider")}
            </Label>
            <Select<{ label: string; value: string }>
              value={value}
              options={identityProviderOptions}
              onChange={onChange}
            />
          </div>
        )}
      />
      <TextField label="Name" placeholder="example" required {...form.register("name")} />
      <TextField label="Username" placeholder="example" required {...form.register("username")} />
      <EmailField label="Email" placeholder="user@example.com" required {...form.register("email")} />
      <TextField label="About" {...form.register("bio")} />
      <Controller
        name="locale"
        render={({ field: { value, onChange } }) => (
          <>
            <Label className="text-default">
              <>{t("language")}</>
            </Label>
            <Select<{ label: string; value: string }>
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
        control={form.control}
        render={({ field: { value } }) => (
          <>
            <Label className="text-default mt-8">
              <>{t("timezone")}</>
            </Label>
            <TimezoneSelect
              id="timezone"
              value={value}
              onChange={(event) => {
                if (event) form.setValue("timeZone", event.value);
              }}
            />
          </>
        )}
      />
      <Controller
        name="timeFormat"
        control={form.control}
        render={({ field: { value } }) => (
          <>
            <Label className="text-default mt-8">
              <>{t("time_format")}</>
            </Label>
            <Select
              value={value}
              options={timeFormatOptions}
              onChange={(event) => {
                if (event) form.setValue("timeFormat", { ...event });
              }}
            />
          </>
        )}
      />
      <Controller
        name="weekStart"
        control={form.control}
        render={({ field: { value } }) => (
          <>
            <Label className="text-default mt-8">
              <>{t("start_of_week")}</>
            </Label>
            <Select
              value={value}
              options={weekStartOptions}
              onChange={(event) => {
                if (event) form.setValue("weekStart", { ...event });
              }}
            />
          </>
        )}
      />

      <br />
      <Button type="submit" color="primary">
        {t(submitLabel)}
      </Button>
    </Form>
  );
};
