import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { MembershipRole } from "@calcom/prisma/enums";
import { _generateMetadata, getTranslate } from "app/_utils";
import DelegationCredentialList from "~/ee/organizations/delegationCredential";
import { validateUserHasOrgPerms } from "../../actions/validateUserHasOrgPerms";

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

  await validateUserHasOrgPerms({
    permission: "organization.update",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

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
