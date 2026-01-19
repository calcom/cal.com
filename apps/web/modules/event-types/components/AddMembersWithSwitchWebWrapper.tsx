import { trpc } from "@calcom/trpc/react";

import type { AddMembersWithSwitchProps } from "@calcom/features/eventtypes/components/AddMembersWithSwitch";
import { AddMembersWithSwitch } from "@calcom/features/eventtypes/components/AddMembersWithSwitch";

export const AddMembersWithSwitchWebWrapper = ({ ...props }: AddMembersWithSwitchProps) => {
  const utils = trpc.useUtils();

  utils.viewer.appRoutingForms.getAttributesForTeam.prefetch({
    teamId: props.teamId,
  });
  return <AddMembersWithSwitch {...props} />;
};
