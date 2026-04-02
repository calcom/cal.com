import { trpc } from "@calcom/trpc/react";
import type { AddMembersWithSwitchProps } from "./AddMembersWithSwitch";
import { AddMembersWithSwitch } from "./AddMembersWithSwitch";

export const AddMembersWithSwitchWebWrapper = ({ ...props }: AddMembersWithSwitchProps) => {
  const utils = trpc.useUtils();

  utils.viewer.appRoutingForms.getAttributesForTeam.prefetch({
    teamId: props.teamId,
  });
  return <AddMembersWithSwitch {...props} />;
};
