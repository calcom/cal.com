import { VerticalTabs } from "@calcom/ui";

import { getAppSettingsOptions } from "../lib/utils";

export const NavigationPanel = (props: { credentialId: string }) => {
  const appSettingsOptions = getAppSettingsOptions(props.credentialId);
  return <VerticalTabs tabs={appSettingsOptions} sticky linkShallow itemClassname="w-[100%] h-[100%]" />;
};
