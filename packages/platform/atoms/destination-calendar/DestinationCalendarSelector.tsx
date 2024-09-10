"use client";

import { useState, useEffect, useMemo } from "react";

import { SingleValueComponent } from "@calcom/features/calendars/DestinationCalendarSelector";
import { OptionComponent } from "@calcom/features/calendars/DestinationCalendarSelector";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ConnectedDestinationCalendars } from "@calcom/platform-libraries";
import { Badge, Select } from "@calcom/ui";

import { getPlaceholderContent } from "../lib/getPlaceholderContent";

export type DestinationCalendarProps = {
  connectedCalendars: ConnectedDestinationCalendars["connectedCalendars"];
  destinationCalendar: ConnectedDestinationCalendars["destinationCalendar"];
  onChange: (value: { externalId: string; integration: string }) => void;
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
  const [selectedOption, setSelectedOption] = useState<{
    value: string;
    label: string;
    subtitle: string;
  } | null>(null);

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
          })),
      })) ?? []
    );
  }, [connectedCalendars]);

  return (
    <div
      className="relative table w-full table-fixed"
      title={`${t("create_events_on")}: ${selectedOption?.label || ""}`}>
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
          control: (defaultStyles) => {
            return {
              ...defaultStyles,
              "@media only screen and (min-width: 640px)": {
                ...(defaultStyles["@media only screen and (min-width: 640px)"] as object),
                maxWidth,
              },
            };
          },
        }}
        isSearchable={false}
        className={classNames(
          "border-default my-2 block w-full min-w-0 flex-1 rounded-none rounded-r-sm text-sm"
        )}
        onChange={(newValue) => {
          setSelectedOption(newValue);
          if (!newValue) {
            return;
          }

          /* Split only the first `:`, since Apple uses the full URL as externalId */
          const [integration, externalId] = newValue.value.split(/:(.+)/);

          onChange({
            integration,
            externalId,
          });
        }}
        isLoading={isPending}
        value={selectedOption}
        components={{ SingleValue: SingleValueComponent, Option: OptionComponent }}
        isMulti={false}
      />
      {hideAdvancedText ? null : (
        <p className="text-sm leading-tight">{t("you_can_override_calendar_in_advanced_tab")}</p>
      )}
    </div>
  );
};
