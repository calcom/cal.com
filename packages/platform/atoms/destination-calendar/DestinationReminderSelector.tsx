"use client";

import { useState, useEffect, useMemo } from "react";

import type { ConnectedDestinationCalendars } from "@calcom/lib/getConnectedDestinationCalendars";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Select } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

export type DestinationReminderSelectorProps = {
  destinationCalendar: ConnectedDestinationCalendars["destinationCalendar"];
};

export const DestinationReminderSelector = ({
  destinationCalendar,
}: DestinationReminderSelectorProps): JSX.Element | null => {
  const { t } = useLocale();

  // Reminder options
  const memoOptions = useMemo(
    () => [
      { label: "Remind 10 minutes before", value: 10 },
      { label: "Remind 30 minutes before", value: 30 },
      { label: "Remind 1 hour before", value: 60 },
    ],
    []
  );

  // Selected option state
  const [selectedOption, setSelectedOption] = useState<{
    value: number;
    label: string;
  } | null>(null);

  useEffect(() => {
    if (destinationCalendar && destinationCalendar.customCalendarReminder) {
      const defaultOption = memoOptions.find(
        (option) => option.value === destinationCalendar.customCalendarReminder
      );
      setSelectedOption(defaultOption || null);
    } else {
      setSelectedOption(null);
    }
  }, [destinationCalendar, memoOptions]);

  const mutation = trpc.viewer.calendars.setDestinationReminder.useMutation({
    onSuccess: () => {
      showToast(t("save_changes"), "success");
    },
    onError(error) {
      showToast(`Error updating reminder: ${error.message}`, "error");
    },
  });

  return (
    <div
      className="relative table w-full table-fixed"
      title={`${t("reminder")}: ${selectedOption?.label || ""}`}>
      <Select
        name="reminderSelector"
        placeholder={`${t("reminder")}`}
        options={memoOptions}
        isSearchable={false}
        className={classNames("border-default my-2 block w-full min-w-0 flex-1 rounded-md text-sm")}
        onChange={(event) => {
          const reminderValue = event?.value || 30;

          mutation.mutate({
            credentialId: destinationCalendar.credentialId,
            integration: destinationCalendar.integration,
            externalId: destinationCalendar.externalId,
            defaultReminder: reminderValue,
          });

          setSelectedOption(memoOptions.find((option) => option.value === reminderValue) || null);
        }}
        value={selectedOption}
        isMulti={false}
      />
      <p className="text-sm leading-tight">{t("you_can_override_calendar_in_advanced_tab")}</p>
    </div>
  );
};
