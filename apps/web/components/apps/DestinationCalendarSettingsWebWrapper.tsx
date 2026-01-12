import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import { AtomsWrapper } from "../../../../packages/platform/atoms/src/components/atoms-wrapper";
import { DestinationCalendarSettings } from "../../../../packages/platform/atoms/destination-calendar/DestinationCalendar";

export const DestinationCalendarSettingsWebWrapper = () => {
  const calendars = trpc.viewer.calendars.connectedCalendars.useQuery();
  const utils = trpc.useUtils();
  const { t } = useLocale();
  const mutation = trpc.viewer.calendars.setDestinationCalendar.useMutation({
    onSuccess: () => {
      utils.viewer.calendars.connectedCalendars.invalidate();
    },
  });

  const mutationReminder = trpc.viewer.calendars.setDestinationReminder.useMutation({
    onSuccess: () => {
      showToast(t("save_changes"), "success");
    },
    onError(error) {
      showToast(`Error updating reminder: ${error.message}`, "error");
    },
  });

  if (!calendars.data?.connectedCalendars || calendars.data.connectedCalendars.length < 1) {
    return null;
  }

  return (
    <AtomsWrapper>
      <DestinationCalendarSettings
        connectedCalendars={calendars.data.connectedCalendars}
        isPending={mutation.isPending}
        destinationCalendar={calendars.data.destinationCalendar}
        value={calendars.data.destinationCalendar.externalId}
        hidePlaceholder
        onChange={mutation.mutate}
        onReminderChange={mutationReminder.mutate}
      />
    </AtomsWrapper>
  );
};
