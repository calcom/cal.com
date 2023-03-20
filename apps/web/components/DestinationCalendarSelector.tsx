import classNames from "classnames";
import React, { useEffect, useState } from "react";
import Select from "react-select";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { DestinationCalendar } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";

interface Props {
  onChange: (value: { externalId: string; integration: string }) => void;
  isLoading?: boolean;
  hidePlaceholder?: boolean;
  /** The external Id of the connected calendar */
  value: string | undefined;
  destinationCalendar?: DestinationCalendar | null;
}

const DestinationCalendarSelector = ({
  onChange,
  isLoading,
  value,
  hidePlaceholder,
  destinationCalendar,
}: Props): JSX.Element | null => {
  const { t } = useLocale();
  const query = trpc.viewer.connectedCalendars.useQuery();
  const [selectedOption, setSelectedOption] = useState<{ value: string; label: string } | null>(null);

  // Extra styles to show prefixed text in react-select
  const content = (hidePlaceholder = false) => {
    if (!hidePlaceholder) {
      return {
        alignItems: "center",
        display: "flex",
        ":before": {
          content: `'${t("select_destination_calendar")}:'`,
          display: "block",
          marginRight: 8,
        },
      };
    }
    return {};
  };

  useEffect(() => {
    const selected = query.data?.connectedCalendars
      .map((connected) => connected.calendars ?? [])
      .flat()
      .find((cal) => cal.externalId === value);

    if (selected) {
      setSelectedOption({
        value: `${selected.integration}:${selected.externalId}`,
        label: selected.name || "",
      });
    }
  }, [query.data?.connectedCalendars, value]);

  if (!query.data?.connectedCalendars.length) {
    return null;
  }
  const options =
    query.data.connectedCalendars.map((selectedCalendar) => ({
      key: selectedCalendar.credentialId,
      label: `${selectedCalendar.integration.title} (${selectedCalendar.primary?.name})`,
      options: (selectedCalendar.calendars ?? [])
        .filter((cal) => cal.readOnly === false)
        .map((cal) => ({
          label: cal.name || "",
          value: `${cal.integration}:${cal.externalId}`,
        })),
    })) ?? [];
  const defaultCalendarSelectedString = destinationCalendar?.externalId
    ? `(${
        destinationCalendar.externalId.length > 15
          ? destinationCalendar.externalId.substring(0, 15) + "..."
          : destinationCalendar.externalId
      })`
    : "";
  return (
    <div className="relative" title={`${t("select_destination_calendar")}: ${selectedOption?.label || ""}`}>
      <Select
        name="primarySelectedCalendar"
        placeholder={
          !hidePlaceholder ? (
            `${t("select_destination_calendar")}`
          ) : (
            <span className="whitespace-nowrap">
              {t("default_calendar_selected")} {defaultCalendarSelectedString}
            </span>
          )
        }
        options={options}
        styles={{
          placeholder: (styles) => ({ ...styles, ...content(hidePlaceholder) }),
          singleValue: (styles) => ({ ...styles, ...content(hidePlaceholder) }),
          control: (defaultStyles) => {
            return {
              ...defaultStyles,
              borderRadius: "6px",
              "@media only screen and (min-width: 640px)": {
                ...(defaultStyles["@media only screen and (min-width: 640px)"] as object),
                width: "100%",
              },
            };
          },
        }}
        isSearchable={false}
        className={classNames(
          "mt-1 mb-2 block w-full min-w-0 flex-1 rounded-none rounded-r-sm border-gray-300 text-sm",
          !hidePlaceholder && "font-medium"
        )}
        onChange={(option) => {
          setSelectedOption(option);
          if (!option) {
            return;
          }

          /* Split only the first `:`, since Apple uses the full URL as externalId */
          const [integration, externalId] = option.value.split(/:(.+)/);

          onChange({
            integration,
            externalId,
          });
        }}
        isLoading={isLoading}
        value={selectedOption}
        components={{
          IndicatorSeparator: () => null,
        }}
      />
    </div>
  );
};

export default DestinationCalendarSelector;
