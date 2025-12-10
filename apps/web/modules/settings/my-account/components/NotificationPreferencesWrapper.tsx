import { getAllNotificationTypesSorted } from "@calcom/features/notifications/registry";
import { NotificationChannel, NotificationType } from "@calcom/features/notifications/types";
import type { NotificationPreferenceData } from "./NotificationPreferencesTable";
import { NotificationPreferencesTable } from "./NotificationPreferencesTable";

interface NotificationPreferencesWrapperProps {
  preferences: NotificationPreferenceData[];
  onPreferenceChange: (
    notificationType: string,
    channel: string,
    enabled: boolean
  ) => void;
  disabled?: boolean;
}

export function NotificationPreferencesWrapper({
  preferences,
  onPreferenceChange,
  disabled = false,
}: NotificationPreferencesWrapperProps) {
  const notificationTypes = getAllNotificationTypesSorted();
  const channels = [NotificationChannel.EMAIL, NotificationChannel.SMS];

  return (
    <NotificationPreferencesTable
      notificationTypes={notificationTypes}
      channels={channels}
      preferences={preferences}
      onPreferenceChange={(notificationType, channel, enabled) => {
        onPreferenceChange(notificationType, channel, enabled);
      }}
      disabled={disabled}
    />
  );
}
