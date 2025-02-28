import { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import DomainWideDelegationList from "@calcom/features/ee/organizations/pages/settings/domainWideDelegation";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("domain_wide_delegation"), t("domain_wide_delegation_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

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
