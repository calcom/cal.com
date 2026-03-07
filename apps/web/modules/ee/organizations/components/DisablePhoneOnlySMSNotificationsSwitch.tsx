"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

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
    onMutate: async ({ disablePhoneOnlySMSNotifications }) => {
      await utils.viewer.organizations.listCurrent.cancel();
      const previousValue =
        !!utils.viewer.organizations.listCurrent.getData()?.organizationSettings.disablePhoneOnlySMSNotifications;

      setDisablePhoneOnlySMSNotificationsActive(disablePhoneOnlySMSNotifications);
      utils.viewer.organizations.listCurrent.setData(undefined, (previousOrg) => {
        if (!previousOrg) return previousOrg;
        return {
          ...previousOrg,
          organizationSettings: {
            ...previousOrg.organizationSettings,
            disablePhoneOnlySMSNotifications,
          },
        };
      });

      return { previousValue };
    },
    onSuccess: async () => {
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: (_error, _variables, context) => {
      if (context) {
        utils.viewer.organizations.listCurrent.setData(undefined, (previousOrg) => {
          if (!previousOrg) return previousOrg;
          return {
            ...previousOrg,
            organizationSettings: {
              ...previousOrg.organizationSettings,
              disablePhoneOnlySMSNotifications: context.previousValue,
            },
          };
        });
        setDisablePhoneOnlySMSNotificationsActive(context.previousValue);
      }
      showToast(t("error_updating_settings"), "error");
    },
  });

  return (
    <>
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("organization_disable_phone_only_sms_notifications_switch_title")}
        description={t("organization_disable_phone_only_sms_notifications_switch_description")}
        checked={disablePhoneOnlySMSNotificationsActive}
        onCheckedChange={(checked) => {
          mutation.mutate({
            disablePhoneOnlySMSNotifications: checked,
          });
        }}
        switchContainerClassName="mt-6"
      />
    </>
  );
};
