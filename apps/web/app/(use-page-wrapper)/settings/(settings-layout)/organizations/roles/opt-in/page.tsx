import { _generateMetadata, getTranslate } from "app/_utils";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import { validateUserHasOrgAdmin } from "../../actions/validateUserHasOrgAdmin";
import { OptInContent } from "./_components/OptInContent";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("roles_and_permissions"),
    (t) => t("roles_and_permissions_opt_in_description"),
    undefined,
    undefined,
    "/settings/organizations/roles/opt-in"
  );

const Page = async () => {
  const t = await getTranslate();
  const session = await validateUserHasOrgAdmin();

  if (!session?.user?.org?.id) {
    throw new Error("Organization not found");
  }

  return (
    <SettingsHeader
      title={t("roles_and_permissions")}
      description={t("roles_and_permissions_opt_in_description")}
      borderInShellHeader={false}>
      <OptInContent organizationId={session.user.org.id} />
    </SettingsHeader>
  );
};

export default Page;
