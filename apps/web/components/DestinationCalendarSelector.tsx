import React, { useEffect, useState } from "react";
import Select from "react-select";

import { useLocale } from "@lib/hooks/useLocale";
import { trpc } from "@lib/trpc";

import Button from "@components/ui/Button";

interface Props {
  onChange: (value: { externalId: string; integration: string }) => void;
  isLoading?: boolean;
  hidePlaceholder?: boolean;
  /** The external Id of the connected calendar */
  value: string | undefined;
}

const DestinationCalendarSelector = ({
  onChange,
  isLoading,
  value,
  hidePlaceholder,
}: Props): JSX.Element | null => {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.connectedCalendars"]);
  const [selectedOption, setSelectedOption] = useState<{ value: string; label: string } | null>(null);

  useEffect(() => {
    if (!selectedOption) {
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
    }
  }, [query.data?.connectedCalendars, selectedOption, value]);

  if (!query.data?.connectedCalendars.length) {
    return null;
  }
  const options =
    query.data.connectedCalendars.map((selectedCalendar) => ({
      key: selectedCalendar.credentialId,
      label: `${selectedCalendar.integration.title} (${selectedCalendar.primary?.name})`,
      options: (selectedCalendar.calendars ?? []).map((cal) => ({
        label: cal.name || "",
        value: `${cal.integration}:${cal.externalId}`,
      })),
    })) ?? [];
  return (
    <div className="relative">
      {/* There's no easy way to customize the displayed value for a Select, so we fake it. */}
      {!hidePlaceholder && (
        <div className="pointer-events-none absolute z-10">
          <Button size="sm" color="secondary" className="m-[1px] rounded-sm border-transparent">
            {t("select_destination_calendar")}: {selectedOption?.label || ""}
          </Button>
        </div>
      )}
      <Select
        name={"primarySelectedCalendar"}
        placeholder={!hidePlaceholder ? `${t("select_destination_calendar")}:` : undefined}
        options={options}
        isSearchable={false}
        className="focus:border-primary-500 focus:ring-primary-500 mt-1 mb-2 block w-full min-w-0 flex-1 rounded-none rounded-r-md border-gray-300 sm:text-sm"
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
      />
    </div>
  );
};

export default DestinationCalendarSelector;
