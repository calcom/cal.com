import classNames from "classnames";
import { useEffect, useState } from "react";
import type { OptionProps, SingleValueProps } from "react-select";
import { components } from "react-select";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { DestinationCalendar } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";
import { Select } from "@calcom/ui";

interface Props {
  onChange: (value: { externalId: string; integration: string }) => void;
  isLoading?: boolean;
  hidePlaceholder?: boolean;
  /** The external Id of the connected calendar */
  destinationCalendar?: DestinationCalendar | null;
  value: string | undefined;
  maxWidth?: number;
}

interface Option {
  label: string;
  value: string;
  subtitle: string;
}

const SingleValueComponent = ({ ...props }: SingleValueProps<Option>) => {
  const { label, subtitle } = props.data;
  return (
    <components.SingleValue {...props} className="flex space-x-1">
      <p>{label}</p> <p className=" text-subtle">{subtitle}</p>
    </components.SingleValue>
  );
};

const OptionComponent = ({ ...props }: OptionProps<Option>) => {
  const { label } = props.data;
  return (
    <components.Option {...props}>
      <span>{label}</span>
    </components.Option>
  );
};

const DestinationCalendarSelector = ({
  onChange,
  isLoading,
  value,
  hidePlaceholder,
  maxWidth,
  destinationCalendar,
}: Props): JSX.Element | null => {
  const { t } = useLocale();
  const query = trpc.viewer.connectedCalendars.useQuery();
  const [selectedOption, setSelectedOption] = useState<{
    value: string;
    label: string;
    subtitle: string;
  } | null>(null);

  // Extra styles to show prefixed text in react-select
  const content = (hidePlaceholder = false) => {
    if (!hidePlaceholder) {
      return {
        alignItems: "center",
        width: "100%",
        display: "flex",
        ":before": {
          content: `'${t("create_events_on")}:'`,
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
      const selectedIntegration = query.data?.connectedCalendars.find((integration) =>
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
  }, [query.data?.connectedCalendars]);

  if (!query.data?.connectedCalendars.length) {
    return null;
  }
  const options =
    query.data.connectedCalendars.map((selectedCalendar) => ({
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
    })) ?? [];

  const queryDestinationCalendar = query.data.destinationCalendar;

  return (
    <div className="relative" title={`${t("create_events_on")}: ${selectedOption?.label || ""}`}>
      <Select
        name="primarySelectedCalendar"
        placeholder={
          !hidePlaceholder ? (
            `${t("create_events_on")}`
          ) : (
            <span className="text-default min-w-0 overflow-hidden truncate whitespace-nowrap">
              {t("default_calendar_selected")}{" "}
              {queryDestinationCalendar.name &&
                `| ${queryDestinationCalendar.name} (${queryDestinationCalendar?.integrationTitle} - ${queryDestinationCalendar.primaryEmail})`}
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
              "@media only screen and (min-width: 640px)": {
                ...(defaultStyles["@media only screen and (min-width: 640px)"] as object),
                maxWidth,
              },
            };
          },
        }}
        isSearchable={false}
        className={classNames(
          "border-default mt-1 mb-2 block w-full min-w-0 flex-1 rounded-none rounded-r-sm text-sm"
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
        isLoading={isLoading}
        value={selectedOption}
        components={{ SingleValue: SingleValueComponent, Option: OptionComponent }}
        isMulti={false}
      />
    </div>
  );
};

export default DestinationCalendarSelector;
