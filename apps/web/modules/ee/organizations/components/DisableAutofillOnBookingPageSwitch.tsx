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

export const DisableAutofillOnBookingPageSwitch = ({ currentOrg }: GeneralViewProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [disableAutofillOnBookingPageActive, setDisableAutofillOnBookingPageActive] = useState(
    !!currentOrg.organizationSettings?.disableAutofillOnBookingPage
  );

  const mutation = trpc.viewer.organizations.update.useMutation({
    onMutate: async ({ disableAutofillOnBookingPage }) => {
      await utils.viewer.organizations.listCurrent.cancel();
      const previousValue =
        !!utils.viewer.organizations.listCurrent.getData()?.organizationSettings.disableAutofillOnBookingPage;

      setDisableAutofillOnBookingPageActive(!!disableAutofillOnBookingPage);
      utils.viewer.organizations.listCurrent.setData(undefined, (previousOrg) => {
        if (!previousOrg) return previousOrg;
        return {
          ...previousOrg,
          organizationSettings: {
            ...previousOrg.organizationSettings,
            disableAutofillOnBookingPage: !!disableAutofillOnBookingPage,
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
              disableAutofillOnBookingPage: context.previousValue,
            },
          };
        });
        setDisableAutofillOnBookingPageActive(context.previousValue);
      }
      showToast(t("error_updating_settings"), "error");
    },
  });

  return (
    <>
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("disable_autofill_on_booking_page")}
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
