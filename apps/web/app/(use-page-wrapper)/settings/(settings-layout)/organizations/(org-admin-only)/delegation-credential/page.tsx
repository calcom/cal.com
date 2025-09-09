import { _generateMetadata, getTranslate } from "app/_utils";

import { validateOrgAdminAccess } from "@calcom/features/auth/lib/validateOrgAdminAccess";
import DelegationCredentialList from "@calcom/features/ee/organizations/pages/settings/delegationCredential";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("delegation_credential"),
    (t) => t("delegation_credential_description"),
    undefined,
    undefined,
    "/settings/organizations/delegation-credential"
  );

const Page = async () => {
  const [t, _session] = await Promise.all([getTranslate(), validateOrgAdminAccess()]);

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
