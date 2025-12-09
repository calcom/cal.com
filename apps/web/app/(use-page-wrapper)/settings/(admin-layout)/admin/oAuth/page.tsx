import { _generateMetadata, getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import OAuthClientsAdminView from "~/settings/admin/oauth-clients-admin-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("oauth_clients_admin"),
    (t) => t("oauth_clients_admin_description"),
    undefined,
    undefined,
    "/settings/admin/oAuth"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("oauth_clients_admin")} description={t("oauth_clients_admin_description")}>
      <OAuthClientsAdminView />
    </SettingsHeader>
  );
};

export default Page;
