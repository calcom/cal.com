import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

const EnforceSSOSwitch = ({
  teamId,
  enforceSingleSignOn,
  disabled,
}: {
  teamId: number;
  enforceSingleSignOn: boolean;
  disabled: boolean;
}) => {
  const { t } = useLocale();

  const utils = trpc.useUtils();

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      showToast(t("your_org_updated_successfully"), "success");
    },
  });

  const [isEnforceSSO, setEnforceSSO] = useState(enforceSingleSignOn);

  return (
    <>
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("enforce_single_sign_on")}
        disabled={disabled || mutation?.isPending}
        description={t("enforce_single_sign_on_description")}
        checked={isEnforceSSO}
        onCheckedChange={(checked) => {
          setEnforceSSO(checked);
          mutation.mutate({ id: teamId, metadata: { enforceSingleSignOn: checked } });
        }}
        switchContainerClassName="my-6"
        data-testid="enforce-sso-check"
      />
    </>
  );
};

export default EnforceSSOSwitch;
