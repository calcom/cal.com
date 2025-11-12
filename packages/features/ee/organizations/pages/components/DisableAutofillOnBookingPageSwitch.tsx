"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

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
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
    onSettled: () => {
      utils.viewer.organizations.listCurrent.invalidate();
    },
  });

  return (
    <>
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("disable_autofill_on_booking_page")}
        disabled={mutation?.isPending}
        description={t("disable_autofill_on_booking_page_description")}
        checked={disableAutofillOnBookingPageActive}
        onCheckedChange={(checked) => {
          mutation.mutate({
            disableAutofillOnBookingPage: checked,
          });
        }}
        switchContainerClassName="mt-6"
      />
    </>
  );
};
