"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

interface IOrgAutoJoinSettingProps {
  orgId: number;
  orgAutoJoinEnabled: boolean;
  emailDomain: string;
}

const OrgAutoJoinSetting = (props: IOrgAutoJoinSettingProps) => {
  const utils = trpc.useUtils();
  const [isEnabled, setIsEnabled] = useState(props.orgAutoJoinEnabled);
  const { t } = useLocale();

  const mutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: async () => {
      showToast(t("your_org_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
    onSettled: () => {
      utils.viewer.organizations.listCurrent.invalidate();
    },
  });

  return (
    <SettingsToggle
      toggleSwitchAtTheEnd={true}
      checked={isEnabled}
      title={t("org_auto_join_title", { emailDomain: props.emailDomain })}
      labelClassName="text-sm"
      description={t("org_auto_join_description")}
      data-testid="make-team-private-check"
      onCheckedChange={(checked) => {
        mutation.mutate({
          orgAutoJoinOnSignup: checked,
        });
        setIsEnabled(checked);
      }}
    />
  );
};

export default OrgAutoJoinSetting;
