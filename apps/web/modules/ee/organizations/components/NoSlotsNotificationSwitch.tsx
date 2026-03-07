import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

interface GeneralViewProps {
  currentOrg: RouterOutputs["viewer"]["organizations"]["listCurrent"];
}

export const NoSlotsNotificationSwitch = ({ currentOrg }: GeneralViewProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [notificationActive, setNotificationActive] = useState(
    !!currentOrg.organizationSettings.adminGetsNoSlotsNotification
  );

  const mutation = trpc.viewer.organizations.update.useMutation({
    onMutate: async ({ adminGetsNoSlotsNotification }) => {
      await utils.viewer.organizations.listCurrent.cancel();
      const previousValue =
        !!utils.viewer.organizations.listCurrent.getData()?.organizationSettings.adminGetsNoSlotsNotification;

      setNotificationActive(adminGetsNoSlotsNotification);
      utils.viewer.organizations.listCurrent.setData(undefined, (previousOrg) => {
        if (!previousOrg) return previousOrg;
        return {
          ...previousOrg,
          organizationSettings: {
            ...previousOrg.organizationSettings,
            adminGetsNoSlotsNotification,
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
              adminGetsNoSlotsNotification: context.previousValue,
            },
          };
        });
        setNotificationActive(context.previousValue);
      }
      showToast(t("error_updating_settings"), "error");
    },
  });

  return (
    <>
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("organization_no_slots_notification_switch_title")}
        description={t("organization_no_slots_notification_switch_description")}
        checked={notificationActive}
        onCheckedChange={(checked) => {
          mutation.mutate({
            adminGetsNoSlotsNotification: checked,
          });
        }}
        switchContainerClassName="mt-6"
      />
    </>
  );
};
