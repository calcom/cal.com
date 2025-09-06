"use client";

import { useState } from "react";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Switch } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

const CalendarNotificationsView = () => {
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);

  const { data: user, refetch } = trpc.viewer.me.get.useQuery();
  const updateProfileMutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: () => {
      showToast(t("settings_updated_successfully"), "success");
      refetch();
      setLoading(false);
    },
    onError: (error) => {
      showToast(error.message, "error");
      setLoading(false);
    },
  });

  const handleToggle = async (enabled: boolean) => {
    setLoading(true);
    updateProfileMutation.mutate({
      notifyCalendarAlerts: enabled,
    });
  };

  return (
    <SettingsHeader
      title={t("calendar_notifications")}
      description={t("calendar_notifications_description")}
      borderInShellHeader={true}>
      <div className="border-subtle rounded-b-xl border-x border-b px-4 pb-10 pt-8 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <h3 className="text-emphasis text-sm font-medium leading-6">
              {t("unreachable_calendar_alerts")}
            </h3>
            <p className="text-subtle mt-1 text-sm">{t("unreachable_calendar_alerts_description")}</p>
          </div>
          <Switch
            checked={user?.notifyCalendarAlerts ?? true}
            onCheckedChange={handleToggle}
            disabled={loading}
          />
        </div>
      </div>
    </SettingsHeader>
  );
};

export default CalendarNotificationsView;
