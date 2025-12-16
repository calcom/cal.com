"use client";

import { memo, useMemo, useCallback } from "react";

import dayjs from "@calcom/dayjs";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { OutOfOfficeToggleGroup } from "@calcom/features/settings/outOfOffice/OutOfOfficeToggleGroup";
import { getHolidayEmoji } from "@calcom/lib/holidays/getHolidayEmoji";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { Select } from "@calcom/ui/components/form";
import { Switch } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

function HolidaysCTA() {
  const { t } = useLocale();
  return (
    <div className="flex gap-2">
      <OutOfOfficeToggleGroup />
      {/* Invisible placeholder to match OOO button width and prevent layout shift */}
      <Button
        color="primary"
        size="base"
        StartIcon="plus"
        className="invisible flex items-center justify-between px-2 md:px-4"
        aria-hidden="true"
        tabIndex={-1}>
        <span className="hidden md:inline">{t("add")}</span>
      </Button>
    </div>
  );
}

type HolidayWithStatus = RouterOutputs["viewer"]["holidays"]["getUserSettings"]["holidays"][number];
type Country = { code: string; name: string };

const getFlagEmoji = (countryCode: string): string | null => {
  if (countryCode.length !== 2) return null;
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const CountrySelector = memo(function CountrySelector({
  countries,
  value,
  onChange,
  isLoading,
}: {
  countries: Country[];
  value: string;
  onChange: (value: string) => void;
  isLoading: boolean;
}) {
  const { t } = useLocale();

  const options = useMemo(
    () => [
      { value: "", label: t("select_country") },
      ...countries.map((country) => {
        const flag = getFlagEmoji(country.code);
        return {
          value: country.code,
          label: flag ? `${flag} ${country.name}` : country.name,
        };
      }),
    ],
    [countries, t]
  );

  const selectedOption = useMemo(() => {
    if (!value) return { value: "", label: t("select_country") };
    const country = countries.find((c) => c.code === value);
    if (!country) return { value, label: value };
    const flag = getFlagEmoji(country.code);
    return { value, label: flag ? `${flag} ${country.name}` : country.name };
  }, [value, countries, t]);

  if (isLoading) {
    return <SkeletonText className="h-9 w-36" />;
  }

  return (
    <Select
      className="w-auto min-w-[180px]"
      value={selectedOption}
      onChange={(option) => onChange(option?.value || "")}
      options={options}
    />
  );
});

const HolidayListItem = memo(function HolidayListItem({
  holiday,
  onToggle,
  isToggling,
}: {
  holiday: HolidayWithStatus;
  onToggle: (holidayId: string, enabled: boolean) => void;
  isToggling: boolean;
}) {
  const formattedDate = holiday.date ? dayjs(holiday.date).format("D MMM, YYYY") : null;
  const emoji = getHolidayEmoji(holiday.name);

  return (
    <div className="border-subtle flex items-center justify-between border-b px-5 py-4 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="bg-subtle flex h-10 w-10 items-center justify-center rounded-lg">
          <span className="text-xl">{emoji}</span>
        </div>
        <div>
          <p className={holiday.enabled ? "text-emphasis font-medium" : "text-muted font-medium"}>
            {holiday.name}
          </p>
          {formattedDate && (
            <p className={holiday.enabled ? "text-subtle text-sm" : "text-muted text-sm"}>{formattedDate}</p>
          )}
        </div>
      </div>
      <Switch
        checked={holiday.enabled}
        onCheckedChange={(checked) => onToggle(holiday.id, checked)}
        disabled={isToggling}
      />
    </div>
  );
});

function ConflictWarning({
  conflicts,
}: {
  conflicts: RouterOutputs["viewer"]["holidays"]["checkConflicts"]["conflicts"];
}) {
  const { t } = useLocale();

  if (conflicts.length === 0) return null;

  const totalBookings = conflicts.reduce((sum, c) => sum + c.bookings.length, 0);

  return (
    <div className="bg-semantic-attention-subtle rounded-md px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon name="triangle-alert" className="text-semantic-attention h-4 w-4 shrink-0" />
        <p className="text-emphasis text-sm font-medium">
          {t("holiday_booking_conflict_warning", { count: totalBookings })}:
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {conflicts.slice(0, 3).map((conflict, idx) => (
            <span key={conflict.holidayId} className="text-default text-sm">
              {conflict.holidayName} ({conflict.bookings.length})
              {idx < Math.min(conflicts.length, 3) - 1 && ","}
            </span>
          ))}
          {conflicts.length > 3 && (
            <span className="text-subtle text-sm">
              +{conflicts.length - 3} {t("more")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function HolidaysView() {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const {
    data: countries,
    isLoading: isLoadingCountries,
    error: countriesError,
  } = trpc.viewer.holidays.getSupportedCountries.useQuery();

  const {
    data: settings,
    isLoading: isLoadingSettings,
    error: settingsError,
  } = trpc.viewer.holidays.getUserSettings.useQuery({});

  const disabledIds = useMemo(
    () => settings?.holidays?.filter((h) => !h.enabled).map((h) => h.id) || [],
    [settings?.holidays]
  );

  const { data: conflictsData } = trpc.viewer.holidays.checkConflicts.useQuery(
    {
      countryCode: settings?.countryCode || "",
      disabledIds,
    },
    {
      enabled: !!settings?.countryCode && !isLoadingSettings,
    }
  );

  const updateSettingsMutation = trpc.viewer.holidays.updateSettings.useMutation({
    onSuccess: () => {
      utils.viewer.holidays.getUserSettings.invalidate();
      utils.viewer.holidays.checkConflicts.invalidate();
      showToast(t("holiday_settings_updated"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const toggleHolidayMutation = trpc.viewer.holidays.toggleHoliday.useMutation({
    onSuccess: () => {
      utils.viewer.holidays.getUserSettings.invalidate();
      utils.viewer.holidays.checkConflicts.invalidate();
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const handleCountryChange = useCallback(
    (countryCode: string) => {
      updateSettingsMutation.mutate({
        countryCode: countryCode || null,
        resetDisabledHolidays: true,
      });
    },
    [updateSettingsMutation]
  );

  const handleToggleHoliday = useCallback(
    (holidayId: string, enabled: boolean) => {
      toggleHolidayMutation.mutate({ holidayId, enabled });
    },
    [toggleHolidayMutation]
  );

  const isLoading = isLoadingCountries || isLoadingSettings;
  const hasError = countriesError || settingsError;

  if (isLoading) {
    return (
      <SettingsHeader title={t("holidays")} description={t("holidays_description")} CTA={<HolidaysCTA />}>
        <SkeletonContainer>
          <div className="space-y-4">
            <SkeletonText className="h-10 w-64" />
            <SkeletonText className="h-64 w-full" />
          </div>
        </SkeletonContainer>
      </SettingsHeader>
    );
  }

  if (hasError) {
    return (
      <SettingsHeader title={t("holidays")} description={t("holidays_description")} CTA={<HolidaysCTA />}>
        <Alert
          severity="error"
          title={t("something_went_wrong")}
          message={countriesError?.message || settingsError?.message}
        />
      </SettingsHeader>
    );
  }

  return (
    <SettingsHeader
      title={t("out_of_office")}
      description={t("out_of_office_description")}
      CTA={<HolidaysCTA />}>
      <div className="space-y-6">
        {conflictsData?.conflicts && conflictsData.conflicts.length > 0 && (
          <ConflictWarning conflicts={conflictsData.conflicts} />
        )}

        <div className="border-subtle bg-muted overflow-hidden rounded-lg border p-5">
          {/* Header with title and country selector */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-emphasis font-semibold">{t("holidays")}</h3>
              <p className="text-subtle text-sm">{t("holidays_description")}</p>
            </div>
            <CountrySelector
              countries={countries || []}
              value={settings?.countryCode || ""}
              onChange={handleCountryChange}
              isLoading={isLoadingCountries}
            />
          </div>

          {/* Holidays list - inner container */}
          {settings?.countryCode ? (
            <div className="border-subtle bg-default overflow-hidden rounded-md border">
              {settings.holidays && settings.holidays.length > 0 ? (
                settings.holidays.map((holiday) => (
                  <HolidayListItem
                    key={holiday.id}
                    holiday={holiday}
                    onToggle={handleToggleHoliday}
                    isToggling={
                      toggleHolidayMutation.isPending &&
                      toggleHolidayMutation.variables?.holidayId === holiday.id
                    }
                  />
                ))
              ) : (
                <div className="text-subtle py-8 text-center text-sm">
                  {t("no_holidays_found_for_country")}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-default flex flex-col items-center rounded-md py-14 text-center">
              <div className="bg-emphasis mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Icon name="calendar" className="text-default h-8 w-8" />
              </div>
              <h4 className="text-emphasis mb-1 font-medium">{t("no_holidays_selected")}</h4>
              <p className="text-subtle text-sm">{t("select_country_to_see_holidays")}</p>
            </div>
          )}
        </div>
      </div>
    </SettingsHeader>
  );
}
