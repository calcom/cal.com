import type { AddMembersWithSwitchProps } from "@calcom/web/modules/event-types/components/AddMembersWithSwitch";
import { AddMembersWithSwitch } from "@calcom/web/modules/event-types/components/AddMembersWithSwitch";

export const AddMembersWithSwitchPlatformWrapper = ({ ...props }: AddMembersWithSwitchProps) => {
  return <AddMembersWithSwitch {...props} />;
};
