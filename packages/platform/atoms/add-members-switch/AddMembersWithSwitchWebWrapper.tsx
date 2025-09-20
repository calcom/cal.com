import type { AddMembersWithSwitchProps } from "@calcom/features/eventtypes/components/AddMembersWithSwitch";
import { AddMembersWithSwitch } from "@calcom/features/eventtypes/components/AddMembersWithSwitch";
import { trpc } from "@calcom/trpc";

export const AddMembersWithSwitchWebWrapper = ({ ...props }: AddMembersWithSwitchProps) => {
  const utils = trpc.useUtils();

  utils.viewer.appRoutingForms.calid_getAttributesForTeam.prefetch({
    calIdTeamId: props.calIdTeamId,
  });
  return <AddMembersWithSwitch {...props} />;
};
