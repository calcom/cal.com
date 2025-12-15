"use client";

import { memo, useMemo, useCallback } from "react";

import dayjs from "@calcom/dayjs";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Label, Select } from "@calcom/ui/components/form";
import { Switch } from "@calcom/ui/components/form";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

import { OutOfOfficeToggleGroup } from "./OutOfOfficeToggleGroup";

function HolidaysCTA() {
  const { t } = useLocale();
  return (
    <div className="flex gap-2">
      <OutOfOfficeToggleGroup />
      <Button color="primary" StartIcon="plus" className="invisible" aria-hidden="true" tabIndex={-1}>
        {t("add")}
      </Button>
    </div>
  );
}

type HolidayWithStatus = RouterOutputs["viewer"]["holidays"]["getUserSettings"]["holidays"][number];
type Country = { code: string; name: string };

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
      { value: "", label: t("no_holidays") },
      ...countries.map((country) => ({
        value: country.code,
        label: country.name,
      })),
    ],
    [countries, t]
  );

  const selectedOption = useMemo(() => {
    if (!value) return { value: "", label: t("select_country") };
    const country = countries.find((c) => c.code === value);
    return { value, label: country?.name || value };
  }, [value, countries, t]);

  if (isLoading) {
    return <SkeletonText className="mt-1 h-10 w-full max-w-xs" />;
  }

  return (
    <Select
      className="mt-1 w-full max-w-xs"
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
  const formattedDate = holiday.date ? dayjs(holiday.date).format("D MMM YYYY") : null;

  return (
    <div className="border-subtle flex items-center justify-between border-b px-4 py-4 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="text-2xl">📆</div>
        <div>
          <p className="text-emphasis font-medium">{holiday.name}</p>
          {formattedDate && <p className="text-subtle text-sm">{formattedDate}</p>}
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

function HolidaysList({
  holidays,
  onToggle,
  togglingId,
}: {
  holidays: HolidayWithStatus[];
  onToggle: (holidayId: string, enabled: boolean) => void;
  togglingId: string | null;
}) {
  const { t } = useLocale();

  if (holidays.length === 0) {
    return <div className="text-subtle py-8 text-center">{t("no_holidays_found_for_country")}</div>;
  }

  return (
    <div className="border-subtle divide-subtle divide-y rounded-md border">
      {holidays.map((holiday) => (
        <HolidayListItem
          key={holiday.id}
          holiday={holiday}
          onToggle={onToggle}
          isToggling={togglingId === holiday.id}
        />
      ))}
    </div>
  );
}

function ConflictWarning({
  conflicts,
}: {
  conflicts: RouterOutputs["viewer"]["holidays"]["checkConflicts"]["conflicts"];
}) {
  const { t } = useLocale();

  if (conflicts.length === 0) return null;

  const totalBookings = conflicts.reduce((sum, c) => sum + c.bookings.length, 0);

  const conflictMessage = (
    <ul className="mt-1 space-y-1">
      {conflicts.slice(0, 3).map((conflict) => (
        <li key={conflict.holidayId}>
          {conflict.holidayName} ({dayjs(conflict.date).format("D MMM")}) -{" "}
          {t("booking_count", { count: conflict.bookings.length })}
        </li>
      ))}
      {conflicts.length > 3 && (
        <li>{t("and_more_holidays_with_conflicts", { count: conflicts.length - 3 })}</li>
      )}
    </ul>
  );

  return (
    <Alert
      severity="warning"
      title={t("holiday_booking_conflict_warning", { count: totalBookings })}
      message={conflictMessage}
      className="mb-4"
    />
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
    <SettingsHeader title={t("holidays")} description={t("holidays_description")} CTA={<HolidaysCTA />}>
      <div className="space-y-6">
        <div className="border-subtle bg-default rounded-md border p-6">
          <Label>{t("country_for_holidays")}</Label>
          <CountrySelector
            countries={countries || []}
            value={settings?.countryCode || ""}
            onChange={handleCountryChange}
            isLoading={isLoadingCountries}
          />
        </div>

        {conflictsData?.conflicts && conflictsData.conflicts.length > 0 && (
          <ConflictWarning conflicts={conflictsData.conflicts} />
        )}

        {settings?.countryCode ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-emphasis font-medium">
                {t("holidays_list")} ({settings.holidays?.filter((h) => h.enabled).length || 0} {t("enabled")}
                )
              </h3>
            </div>
            <HolidaysList
              holidays={settings.holidays || []}
              onToggle={handleToggleHoliday}
              togglingId={
                toggleHolidayMutation.isPending ? toggleHolidayMutation.variables?.holidayId || null : null
              }
            />
          </div>
        ) : (
          <EmptyScreen
            Icon="calendar"
            headline={t("no_holidays_selected")}
            description={t("select_country_to_see_holidays")}
          />
        )}
      </div>
    </SettingsHeader>
  );
}
