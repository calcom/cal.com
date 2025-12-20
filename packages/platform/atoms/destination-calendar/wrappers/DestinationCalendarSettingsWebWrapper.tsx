import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { DestinationCalendarSettings } from "../DestinationCalendar";

export const DestinationCalendarSettingsWebWrapper = () => {
  const { t } = useLocale();
  const calendars = trpc.viewer.calendars.connectedCalendars.useQuery();
  const utils = trpc.useUtils();
  const mutation = trpc.viewer.calendars.setDestinationCalendar.useMutation({
    onSuccess: () => {
      utils.viewer.calendars.connectedCalendars.invalidate();
    },
  });

  const reminderMutation = trpc.viewer.calendars.setDestinationReminder.useMutation({
    onSuccess: () => {
      showToast(t("reminder_updated"), "success");
      utils.viewer.calendars.connectedCalendars.invalidate();
    },
    onError: () => {
      showToast(t("error_updating_reminder"), "error");
    },
  });

  if (!calendars.data?.connectedCalendars || calendars.data.connectedCalendars.length < 1) {
    return null;
  }

  const handleReminderChange = (value: number) => {
    const destCal = calendars.data.destinationCalendar;
    if (destCal?.credentialId) {
      reminderMutation.mutate({
        credentialId: destCal.credentialId,
        integration: destCal.integration,
        defaultReminder: value,
      });
    }
  };

  return (
    <AtomsWrapper>
      <DestinationCalendarSettings
        connectedCalendars={calendars.data.connectedCalendars}
        isPending={mutation.isPending}
        destinationCalendar={calendars.data.destinationCalendar}
        value={calendars.data.destinationCalendar.externalId}
        hidePlaceholder
        onChange={mutation.mutate}
        onReminderChange={handleReminderChange}
        reminderValue={calendars.data.destinationCalendar.customCalendarReminder ?? 10}
        isReminderPending={reminderMutation.isPending}
      />
    </AtomsWrapper>
  );
};
