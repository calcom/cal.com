import { _generateMetadata, getTranslate } from "app/_utils";

import { OrganizationFeatureFlagsView } from "@calcom/features/flags/pages/organization-feature-flags-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import { validateUserHasOrg } from "../actions/validateUserHasOrg";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("feature_flags"),
    (t) => t("organization_feature_flags_description"),
    undefined,
    undefined,
    "/settings/organizations/feature-flags"
  );

const Page = async () => {
  const session = await validateUserHasOrg();
  const t = await getTranslate();

  const organizationId = session.user.profile.organizationId;

  if (!organizationId) {
    return null;
  }

  return (
    <SettingsHeader
      title={t("feature_flags")}
      description={t("organization_feature_flags_description")}
      borderInShellHeader={true}>
      <OrganizationFeatureFlagsView organizationId={organizationId} />
    </SettingsHeader>
  );
};

export default Page;
