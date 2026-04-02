import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import OAuthClientsAdminView from "~/settings/admin/oauth-clients-admin-view";

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  await getTranslate();

  if (!session) {
    redirect("/auth/login?callbackUrl=/settings/admin/oauth");
  }

  return <OAuthClientsAdminView />;
};

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("oauth_clients_admin"),
    (t) => t("oauth_clients_admin_description"),
    undefined,
    undefined,
    "/settings/admin/oauth"
  );

export default Page;
