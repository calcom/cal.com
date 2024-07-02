import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast, SettingsToggle } from "@calcom/ui";

const DisableTeamImpersonation = ({
  teamId,
  memberId,
  disabled,
}: {
  teamId: number;
  memberId: number;
  disabled: boolean;
}) => {
  const { t } = useLocale();

  const utils = trpc.useUtils();

  const query = trpc.viewer.teams.getMembershipbyUser.useQuery({ teamId, memberId });

  const mutation = trpc.viewer.teams.updateMembership.useMutation({
    onSuccess: async () => {
      showToast(t("your_user_profile_updated_successfully"), "success");
      await utils.viewer.teams.getMembershipbyUser.invalidate();
    },
  });
  const [allowImpersonation, setAllowImpersonation] = useState(!query.data?.disableImpersonation ?? true);
  if (query.isPending) return <></>;

  return (
    <>
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("user_impersonation_heading")}
        disabled={disabled || mutation?.isPending}
        description={t("team_impersonation_description")}
        checked={allowImpersonation}
        onCheckedChange={(_allowImpersonation) => {
          setAllowImpersonation(_allowImpersonation);
          mutation.mutate({ teamId, memberId, disableImpersonation: !_allowImpersonation });
        }}
        switchContainerClassName="mt-6"
      />
    </>
  );
};

export default DisableTeamImpersonation;
