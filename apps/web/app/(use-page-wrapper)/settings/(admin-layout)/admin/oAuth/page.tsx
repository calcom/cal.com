import { _generateMetadata, getTranslate } from "app/_utils";

import OAuthClientsAdminView from "~/settings/admin/oauth-clients-admin-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("oauth_clients_admin"),
    (t) => t("oauth_clients_admin_description"),
    undefined,
    undefined,
    "/settings/admin/oauth"
  );

const Page = async () => {
  const t = await getTranslate();
  return <OAuthClientsAdminView />;
};

export default Page;
