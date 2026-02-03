import { getTranslate, _generateMetadata } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import { AdminAPIView } from "~/ee/organizations/admin-api";

import { validateUserHasOrg } from "../actions/validateUserHasOrg";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => `${t("admin")} ${t("api_reference")}`,
    (t) => t("leverage_our_api"),
    undefined,
    undefined,
    "/settings/organizations/admin-api"
  );

const Page = async () => {
  const t = await getTranslate();

  await validateUserHasOrg();

  return (
    <SettingsHeader
      title={`${t("admin")} ${t("api_reference")}`}
      description={t("leverage_our_api")}
      borderInShellHeader={false}>
      <AdminAPIView />
    </SettingsHeader>
  );
};

export default Page;
