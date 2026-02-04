import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  type ReminderMinutes,
  reminderSchema,
} from "@calcom/trpc/server/routers/viewer/calendars/setDestinationReminder.schema";
import { showToast } from "@calcom/ui/components/toast";
import { DestinationCalendarSettings } from "../../../../packages/platform/atoms/destination-calendar/DestinationCalendar";
import { AtomsWrapper } from "../../../../packages/platform/atoms/src/components/atoms-wrapper";
export const DestinationCalendarSettingsWebWrapper = ({
  connectedCalendars,
}: {
  connectedCalendars?: RouterOutputs["viewer"]["calendars"]["connectedCalendars"];
}): JSX.Element | null => {
  const { t } = useLocale();
  const calendars = trpc.viewer.calendars.connectedCalendars.useQuery(undefined, {
    initialData: connectedCalendars,
  });
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

  const handleReminderChange = (value: ReminderMinutes): void => {
    const destCal = calendars.data.destinationCalendar;
    if (destCal?.credentialId) {
      reminderMutation.mutate({
        credentialId: destCal.credentialId,
        integration: destCal.integration,
        defaultReminder: value,
      });
    }
  };

  const validatedReminderValue = reminderSchema.safeParse(
    calendars.data.destinationCalendar?.customCalendarReminder
  );
  let reminderValue: ReminderMinutes = null;
  if (validatedReminderValue.success) {
    reminderValue = validatedReminderValue.data;
  }

  return (
    <AtomsWrapper>
      <DestinationCalendarSettings
        connectedCalendars={calendars.data.connectedCalendars}
        isPending={mutation.isPending}
        destinationCalendar={calendars.data.destinationCalendar}
        value={calendars.data.destinationCalendar?.externalId}
        hidePlaceholder
        onChange={mutation.mutate}
        onReminderChange={handleReminderChange}
        reminderValue={reminderValue}
        isReminderPending={reminderMutation.isPending}
      />
    </AtomsWrapper>
  );
};
