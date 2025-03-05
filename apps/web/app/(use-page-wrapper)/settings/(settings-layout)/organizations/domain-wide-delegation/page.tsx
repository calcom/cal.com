import { _generateMetadata, getTranslate } from "app/_utils";

import DomainWideDelegationList from "@calcom/features/ee/organizations/pages/settings/domainWideDelegation";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("domain_wide_delegation"),
    (t) => t("domain_wide_delegation_description")
  );

const Page = async () => {
  const t = await getTranslate();

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
