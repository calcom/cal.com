import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import DelegationCredentialList from "@calcom/features/ee/organizations/pages/settings/delegationCredential";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("delegation_credential"), t("delegation_credential_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);

  return (
    <SettingsHeader
      borderInShellHeader
      title={t("delegation_credential")}
      description={t("delegation_credential_description")}>
      <DelegationCredentialList />
    </SettingsHeader>
  );
};

export default Page;
