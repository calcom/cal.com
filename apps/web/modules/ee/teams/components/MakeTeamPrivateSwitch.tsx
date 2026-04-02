import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

const MakeTeamPrivateSwitch = ({
  teamId,
  isPrivate,
  disabled,
  isOrg,
}: {
  teamId: number;
  isPrivate: boolean;
  disabled: boolean;
  isOrg: boolean;
}) => {
  const { t } = useLocale();

  const utils = trpc.useUtils();

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      showToast(t(isOrg ? "your_org_updated_successfully" : "your_team_updated_successfully"), "success");
    },
  });

  const [isTeamPrivate, setTeamPrivate] = useState(isPrivate);

  return (
    <>
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t(isOrg ? "make_org_private" : "make_team_private")}
        labelClassName="text-sm"
        disabled={disabled || mutation?.isPending}
        description={t(isOrg ? "make_org_private_description" : "make_team_private_description")}
        checked={isTeamPrivate}
        onCheckedChange={(checked) => {
          setTeamPrivate(checked);
          mutation.mutate({ id: teamId, isPrivate: checked });
        }}
        data-testid="make-team-private-check"
      />
    </>
  );
};

export default MakeTeamPrivateSwitch;
