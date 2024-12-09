import { _generateMetadata, getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/features/auth/lib/get-server-session-for-app-dir";
import DomainWideDelegationList from "@calcom/features/ee/organizations/pages/settings/domainWideDelegation";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("domain_wide_delegation"),
    (t) => t("domain_wide_delegation_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader
      borderInShellHeader
      title={t("domain_wide_delegation")}
      description={t("domain_wide_delegation_description")}>
      <DomainWideDelegationList />
    </SettingsHeader>
  );
};

export default Page;
