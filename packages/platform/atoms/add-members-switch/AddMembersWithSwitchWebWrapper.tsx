import type { AddMembersWithSwitchProps } from "@calcom/web/modules/event-types/components/AddMembersWithSwitch";
import { AddMembersWithSwitch } from "@calcom/web/modules/event-types/components/AddMembersWithSwitch";
import { trpc } from "@calcom/trpc/react";

export const AddMembersWithSwitchWebWrapper = ({ ...props }: AddMembersWithSwitchProps) => {
  const utils = trpc.useUtils();

  utils.viewer.appRoutingForms.getAttributesForTeam.prefetch({
    teamId: props.teamId,
  });
  return <AddMembersWithSwitch {...props} />;
};
