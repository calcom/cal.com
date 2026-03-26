import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import OAuthClientsView from "~/settings/developer/oauth-clients-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("oauth_clients"),
    (t) => t("oauth_clients_description"),
    undefined,
    undefined,
    "/settings/developer/oauth"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const t = await getTranslate();

  if (!session) {
    redirect("/auth/login?callbackUrl=/settings/developer/oauth");
  }

  return <OAuthClientsView />;
};

export default Page;
