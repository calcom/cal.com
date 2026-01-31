import { trpc } from "@calcom/trpc/react";

import type { AddMembersWithSwitchProps } from "@calcom/features/eventtypes/components/AddMembersWithSwitch";
import { AddMembersWithSwitch } from "@calcom/features/eventtypes/components/AddMembersWithSwitch";
import { Segment } from "@calcom/web/modules/event-types/components/Segment";

export const AddMembersWithSwitchWebWrapper = ({
  ...props
}: Omit<AddMembersWithSwitchProps, "SegmentComponent">) => {
  const utils = trpc.useUtils();

  utils.viewer.appRoutingForms.getAttributesForTeam.prefetch({
    teamId: props.teamId,
  });
  return <AddMembersWithSwitch {...props} SegmentComponent={Segment} />;
};
