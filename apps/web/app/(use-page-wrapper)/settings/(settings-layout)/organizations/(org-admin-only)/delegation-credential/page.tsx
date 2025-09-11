import { _generateMetadata, getTranslate } from "app/_utils";

import DelegationCredentialList from "@calcom/features/ee/organizations/pages/settings/delegationCredential";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import { validateUserHasOrgAdmin } from "../../actions/validateUserHasOrgAdmin";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("delegation_credential"),
    (t) => t("delegation_credential_description"),
    undefined,
    undefined,
    "/settings/organizations/delegation-credential"
  );

const Page = async () => {
  const t = await getTranslate();

  await validateUserHasOrgAdmin();

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
