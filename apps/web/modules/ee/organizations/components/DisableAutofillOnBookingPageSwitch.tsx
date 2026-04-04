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

export const DisableAutofillOnBookingPageSwitch = ({ currentOrg }: GeneralViewProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [disableAutofillOnBookingPageActive, setDisableAutofillOnBookingPageActive] = useState(
    !!currentOrg.organizationSettings?.disableAutofillOnBookingPage
  );

  const mutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: async (_data, variables) => {
      setDisableAutofillOnBookingPageActive(!!variables.disableAutofillOnBookingPage);
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
        title={t("disable_autofill_on_booking_page")}
        disabled={mutation?.isPending}
        description={t("disable_autofill_on_booking_page_description")}
        checked={disableAutofillOnBookingPageActive}
        onCheckedChange={(checked) => {
          mutation.mutate({
            disableAutofillOnBookingPage: checked,
          });
        }}
      />
    </>
  );
};
