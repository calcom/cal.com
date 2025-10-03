import type { AddMembersWithSwitchProps } from "@calcom/features/eventtypes/components/AddMembersWithSwitch";
import { AddMembersWithSwitch } from "@calcom/features/eventtypes/components/AddMembersWithSwitch";
import { trpc } from "@calcom/trpc";

export const AddMembersWithSwitchCalIdWrapper = ({ ...props }: AddMembersWithSwitchProps) => {
  const utils = trpc.useUtils();

  // Only prefetch if teamId is defined and use calId-specific attributes
  if (props.calIdTeamId) {
    // Check if this is a calId team by looking at the event type context
    // For now, we'll use the regular team attributes, but this could be enhanced
    // to detect calId teams and use the calId-specific endpoint
    utils.viewer.appRoutingForms.calid_getAttributesForTeam.prefetch({
      teamId: props.calIdTeamId,
    });
  }
  return <AddMembersWithSwitch {...props} />;
};
