import { VerticalTabs } from "@calcom/ui";

import { getAppSettingsOptions } from "../lib";

export const NavigationPanel = (props: { credentialId: number }) => {
  const appSettingsOptions = getAppSettingsOptions(props.credentialId);
  return <VerticalTabs tabs={appSettingsOptions} linkShallow itemClassname="w-[100%] h-[100%]" />;
};
