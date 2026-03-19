"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

interface BlocklistSkipCrmOnCancelSwitchProps {
  currentOrg: RouterOutputs["viewer"]["organizations"]["listCurrent"];
}

export const BlocklistSkipCrmOnCancelSwitch = ({ currentOrg }: BlocklistSkipCrmOnCancelSwitchProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [skipCrmOnCancel, setSkipCrmOnCancel] = useState(
    !!currentOrg.organizationSettings?.skipCrmOnBookingReport
  );

  const mutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: async () => {
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      setSkipCrmOnCancel(!!currentOrg.organizationSettings?.skipCrmOnBookingReport);
      showToast(t("error_updating_settings"), "error");
    },
    onSettled: () => {
      utils.viewer.organizations.listCurrent.invalidate();
    },
  });

  return (
    <SettingsToggle
      toggleSwitchAtTheEnd={true}
      title={t("skip_crm_on_booking_report_title")}
      disabled={mutation?.isPending}
      description={t("skip_crm_on_booking_report_description")}
      checked={skipCrmOnCancel}
      onCheckedChange={(checked) => {
        setSkipCrmOnCancel(checked);
        mutation.mutate({
          skipCrmOnBookingReport: checked,
        });
      }}
      switchContainerClassName="mt-6"
    />
  );
};
