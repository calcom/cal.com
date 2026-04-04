"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { toastManager } from "@coss/ui/components/toast";
import { SettingsToggle } from "@coss/ui/shared/settings-toggle";
import { useState } from "react";

interface GeneralViewProps {
  currentOrg: RouterOutputs["viewer"]["organizations"]["listCurrent"];
}

export const DisablePhoneOnlySMSNotificationsSwitch = ({ currentOrg }: GeneralViewProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [disablePhoneOnlySMSNotificationsActive, setDisablePhoneOnlySMSNotificationsActive] = useState(
    !!currentOrg.organizationSettings.disablePhoneOnlySMSNotifications
  );

  const mutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: async () => {
      toastManager.add({ title: t("settings_updated_successfully"), type: "success" });
    },
    onError: () => {
      toastManager.add({ title: t("error_updating_settings"), type: "error" });
    },
    onSettled: () => {
      utils.viewer.organizations.listCurrent.invalidate();
    },
  });

  return (
    <>
      <SettingsToggle
        title={t("organization_disable_phone_only_sms_notifications_switch_title")}
        disabled={mutation?.isPending}
        description={t("organization_disable_phone_only_sms_notifications_switch_description")}
        checked={disablePhoneOnlySMSNotificationsActive}
        onCheckedChange={(checked) => {
          mutation.mutate({
            disablePhoneOnlySMSNotifications: checked,
          });
          setDisablePhoneOnlySMSNotificationsActive(checked);
        }}
      />
    </>
  );
};
