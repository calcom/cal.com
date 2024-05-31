import { VerticalTabs } from "@calcom/ui";

import { useAppCredential } from "../context/CredentialContext";
import { getAppSettingsOptions } from "../lib";

export const NavigationPanel = () => {
  const { credentialId } = useAppCredential();
  const appSettingsOptions = getAppSettingsOptions(credentialId);
  return <VerticalTabs tabs={appSettingsOptions} linkShallow itemClassname="w-[100%] h-[100%]" />;
};
