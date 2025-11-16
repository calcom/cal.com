"use client";

import { useState, useEffect, useMemo } from "react";

import { SingleValueComponent } from "@calcom/features/calendars/DestinationCalendarSelector";
import { OptionComponent } from "@calcom/features/calendars/DestinationCalendarSelector";
import type { ConnectedDestinationCalendars } from "@calcom/features/calendars/lib/getConnectedDestinationCalendars";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/client";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Select } from "@calcom/ui/components/form";

import { getPlaceholderContent } from "../lib/getPlaceholderContent";

export type DestinationCalendarProps = {
  connectedCalendars: ConnectedDestinationCalendars["connectedCalendars"];
  destinationCalendar: ConnectedDestinationCalendars["destinationCalendar"];
  onChange: (value: { externalId: string; integration: string; delegationCredentialId?: string }) => void;
  isPending?: boolean;
  hidePlaceholder?: boolean;
  value: string | undefined;
  maxWidth?: number;
  hideAdvancedText?: boolean;
};

export const DestinationCalendarSelector = ({
  connectedCalendars,
  destinationCalendar,
  onChange,
  isPending,
  value,
  hidePlaceholder,
  hideAdvancedText,
  maxWidth,
}: DestinationCalendarProps): JSX.Element | null => {
  const { t } = useLocale();

  const utils = trpc.useUtils();

  const setReminderMutation = trpc.viewer.calendars.setDestinationReminder.useMutation({
    onSuccess: () => {
      utils.viewer.calendars.connectedCalendars.invalidate();
    },
  });

  const [selectedOption, setSelectedOption] = useState<{
    value: string;
    label: string;
    subtitle: string;
    delegationCredentialId?: string;
  } | null>(null);

  const [reminder, setReminder] = useState<number | null>(destinationCalendar?.reminderMinutes ?? null);

  const reminderOptions = [
    { value: 0, label: "No reminder" },
    { value: 5, label: "5 minutes before" },
    { value: 10, label: "10 minutes before" },
    { value: 15, label: "15 minutes before" },
    { value: 30, label: "30 minutes before" },
    { value: 60, label: "1 hour before" },
  ];

  const handleReminderChange = (newValue: any) => {
    const minutes = Number(newValue.value);
    setReminder(minutes);

    if (!destinationCalendar?.id) return;

    setReminderMutation.mutate({
      destinationCalendarId: destinationCalendar.id,
      reminderMinutes: minutes,
    });
  };

  // ======================== Existing useEffect ==================================
  useEffect(() => {
    const selected = connectedCalendars
      .map((connected) => connected.calendars ?? [])
      .flat()
      .find((cal) => cal.externalId === value);

    if (selected) {
      const selectedIntegration = connectedCalendars.find((integration) =>
        integration.calendars?.some((calendar) => calendar.externalId === selected.externalId)
      );

      setSelectedOption({
        value: `${selected.integration}:${selected.externalId}`,
        label: `${selected.name} ` || "",
        subtitle: `(${selectedIntegration?.integration.title?.replace(/calendar/i, "")} - ${
          selectedIntegration?.primary?.name
        })`,
      });
    }
  }, [connectedCalendars]);
  // ==============================================================================

  const options = useMemo(() => {
    return (
      connectedCalendars.map((selectedCalendar) => ({
        key: selectedCalendar.credentialId,
        label: `${selectedCalendar.integration.title?.replace(/calendar/i, "")} (${
          selectedCalendar.primary?.integration === "office365_calendar"
            ? selectedCalendar.primary?.email
            : selectedCalendar.primary?.name
        })`,
        options: (selectedCalendar.calendars ?? [])
          .filter((cal) => cal.readOnly === false)
          .map((cal) => ({
            label: ` ${cal.name} `,
            subtitle: `(${selectedCalendar?.integration.title?.replace(/calendar/i, "")} - ${
              selectedCalendar?.primary?.name
            })`,
            value: `${cal.integration}:${cal.externalId}`,
            delegationCredentialId: cal.delegationCredentialId || undefined,
          })),
      })) ?? []
    );
  }, [connectedCalendars]);

  return (
    <div className="relative table w-full table-fixed">
      {/* ======================= CALENDAR SELECT ======================= */}
      <Select
        name="primarySelectedCalendar"
        placeholder={
          !hidePlaceholder ? (
            `${t("create_events_on")}`
          ) : (
            <span className="text-default min-w-0 overflow-hidden truncate whitespace-nowrap">
              <Badge variant="blue">Default</Badge>{" "}
              {destinationCalendar?.primaryEmail &&
                `${destinationCalendar.name} (${destinationCalendar?.integrationTitle} - ${destinationCalendar.primaryEmail})`}
            </span>
          )
        }
        options={options}
        styles={{
          placeholder: (styles) => ({
            ...styles,
            ...getPlaceholderContent(hidePlaceholder, `'${t("create_events_on")}:'`),
          }),
          singleValue: (styles) => ({
            ...styles,
            ...getPlaceholderContent(hidePlaceholder, `'${t("create_events_on")}:'`),
          }),
          control: (defaultStyles) => ({
            ...defaultStyles,
            "@media only screen and (min-width: 640px)": {
              ...(defaultStyles["@media only screen and (min-width: 640px)"] as object),
              maxWidth,
            },
          }),
        }}
        isSearchable={false}
        className={classNames(
          "border-default my-2 block w-full min-w-0 flex-1 rounded-none rounded-r-sm text-sm"
        )}
        onChange={(newValue) => {
          setSelectedOption(newValue);
          if (!newValue) return;

          const [integration, externalId] = newValue.value.split(/:(.+)/);

          onChange({
            integration,
            externalId,
            delegationCredentialId: newValue.delegationCredentialId,
          });
        }}
        isLoading={isPending}
        value={selectedOption}
        components={{ SingleValue: SingleValueComponent, Option: OptionComponent }}
        isMulti={false}
      />

      {!hideAdvancedText ? (
        <p className="text-sm leading-tight">{t("you_can_override_calendar_in_advanced_tab")}</p>
      ) : null}

      {/* ======================= REMINDER SELECT ======================= */}
      <div className="mt-3">
        <Select
          name="calendarReminderMinutes"
          placeholder="Reminder"
          isSearchable={false}
          options={reminderOptions}
          value={reminderOptions.find((opt) => opt.value === reminder) || null}
          onChange={handleReminderChange}
          isLoading={setReminderMutation.isPending}
          className="border-default block w-full rounded-sm text-sm"
        />
        <p className="text-default-600 mt-1 text-xs">
          Choose how long before the event you want to receive reminders.
        </p>
      </div>
    </div>
  );
};
