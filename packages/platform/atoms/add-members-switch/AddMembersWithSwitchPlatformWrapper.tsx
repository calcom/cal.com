import type { AddMembersWithSwitchProps } from "@calcom/features/eventtypes/components/AddMembersWithSwitch";
import { AddMembersWithSwitch } from "@calcom/features/eventtypes/components/AddMembersWithSwitch";

export const AddMembersWithSwitchPlatformWrapper = ({ ...props }: AddMembersWithSwitchProps) => {
  return <AddMembersWithSwitch {...props} />;
};
