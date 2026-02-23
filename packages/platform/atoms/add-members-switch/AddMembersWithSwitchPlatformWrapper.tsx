// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import type { AddMembersWithSwitchProps } from "@calcom/web/modules/event-types/components/AddMembersWithSwitch";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { AddMembersWithSwitch } from "@calcom/web/modules/event-types/components/AddMembersWithSwitch";

export const AddMembersWithSwitchPlatformWrapper = ({ ...props }: AddMembersWithSwitchProps) => {
  return <AddMembersWithSwitch {...props} />;
};
