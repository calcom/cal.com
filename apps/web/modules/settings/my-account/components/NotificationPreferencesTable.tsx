"use client";

import type { NotificationTypeConfig } from "@calcom/features/notifications/registry";
import { NotificationChannel } from "@calcom/features/notifications/types";
import type { NotificationType } from "@calcom/features/notifications/types";
import { Checkbox } from "@calcom/ui/components/form/checkbox/Checkbox";

export interface NotificationPreferenceData {
  notificationType: NotificationType;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

export interface NotificationPreferencesTableProps {
  notificationTypes: NotificationTypeConfig[];
  channels: NotificationChannel[];
  preferences: NotificationPreferenceData[];
  onPreferenceChange: (
    notificationType: NotificationType,
    channel: NotificationChannel,
    enabled: boolean
  ) => void;
  disabled?: boolean;
}

const getChannelLabel = (channel: NotificationChannel): string => {
  switch (channel) {
    case NotificationChannel.EMAIL:
      return "Email";
    case NotificationChannel.SMS:
      return "SMS";
    default:
      return channel;
  }
};

const getPreferenceValue = (
  preferences: NotificationPreferenceData[],
  notificationType: NotificationType,
  channel: NotificationChannel
): boolean => {
  const preference = preferences.find((p) => p.notificationType === notificationType);
  if (!preference) return true;

  switch (channel) {
    case NotificationChannel.EMAIL:
      return preference.emailEnabled;
    case NotificationChannel.SMS:
      return preference.smsEnabled;
    default:
      return true;
  }
};

export function NotificationPreferencesTable({
  notificationTypes,
  channels,
  preferences,
  onPreferenceChange,
  disabled = false,
}: NotificationPreferencesTableProps) {
  return (
    <div className="border-subtle rounded-xl border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-subtle border-b">
              <th className="text-emphasis px-4 py-3 text-left text-sm font-semibold">Event Type</th>
              {channels.map((channel) => (
                <th key={channel} className="text-emphasis px-4 py-3 text-center text-sm font-semibold">
                  {getChannelLabel(channel)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {notificationTypes.map((notificationType) => (
              <tr key={notificationType.type} className="border-subtle border-b last:border-b-0">
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-emphasis text-sm font-medium">{notificationType.label}</span>
                    {notificationType.description && (
                      <span className="text-muted text-xs">{notificationType.description}</span>
                    )}
                  </div>
                </td>
                {channels.map((channel) => {
                  const isSupported = notificationType.supportedChannels.includes(channel);
                  const isChecked = getPreferenceValue(preferences, notificationType.type, channel);

                  return (
                    <td key={channel} className="px-4 py-3 text-center">
                      {isSupported ? (
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            onPreferenceChange(notificationType.type, channel, checked === true);
                          }}
                          disabled={disabled}
                          className="mx-auto"
                        />
                      ) : (
                        <span className="text-muted text-sm">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
