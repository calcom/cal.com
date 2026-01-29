"use client";

import { useState, useEffect, useMemo } from "react";

import {
  OptionComponent,
  SingleValueComponent,
} from "@calcom/features/calendars/components/DestinationCalendarSelector";
import type { ConnectedDestinationCalendars } from "@calcom/features/calendars/lib/getConnectedDestinationCalendars";
import { useLocale } from "@calcom/lib/hooks/useLocale";
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
  const [selectedOption, setSelectedOption] = useState<{
    value: string;
    label: string;
    subtitle: string;
    delegationCredentialId?: string;
  } | null>(null);

  useEffect(() => {
    const selected = connectedCalendars
      .flatMap((connected) => connected.calendars ?? [])
      .find((cal) => cal.externalId === value);

    if (selected) {
      const selectedIntegration = connectedCalendars.find((integration) =>
        integration.calendars?.some((calendar) => calendar.externalId === selected.externalId)
      );

      const label = selected.name ? `${selected.name} ` : "";
      setSelectedOption({
        value: `${selected.integration}:${selected.externalId}`,
        label,
        subtitle: `(${selectedIntegration?.integration.title?.replace(/calendar/i, "")} - ${
          selectedIntegration?.primary?.name
        })`,
      });
    }
  }, [connectedCalendars, value]);

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
    <div
      className="relative table w-full table-fixed"
      title={`${t("create_events_on")}: ${selectedOption?.label || ""}`}>
      <Select
        name="primarySelectedCalendar"
        placeholder={
          !hidePlaceholder ? (
            `${t("create_events_on")}`
          ) : (
            <span className="min-w-0 overflow-hidden truncate whitespace-nowrap text-default">
              <Badge variant="blue">{t("default")}</Badge>{" "}
              {destinationCalendar?.primaryEmail &&
                `${destinationCalendar.name} (${destinationCalendar?.integrationTitle} - ${destinationCalendar.primaryEmail})`}
            </span>
          )
        }
        options={options}
        styles={{
          placeholder: (styles) =>
            Object.assign({}, styles, getPlaceholderContent(hidePlaceholder, `'${t("create_events_on")}:'`)),
          singleValue: (styles) =>
            Object.assign({}, styles, getPlaceholderContent(hidePlaceholder, `'${t("create_events_on")}:'`)),
          control: (defaultStyles) =>
            Object.assign({}, defaultStyles, {
              "@media only screen and (min-width: 640px)": Object.assign(
                {},
                defaultStyles["@media only screen and (min-width: 640px)"] as object,
                { maxWidth }
              ),
            }),
        }}
        isSearchable={false}
        className={classNames(
          "my-2 block w-full min-w-0 flex-1 rounded-none rounded-r-sm border-default text-sm"
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
            delegationCredentialId: newValue.delegationCredentialId,
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
