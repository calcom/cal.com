import { _generateMetadata } from "app/_utils";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import OAuthClientUsersView from "~/settings/developer/oauth-client-users-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("oauth_authorized_users"),
    (t) => t("oauth_authorized_users_description"),
    undefined,
    undefined,
    "/settings/developer/oauth"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session) {
    redirect("/auth/login?callbackUrl=/settings/developer/oauth");
  }

  return <OAuthClientUsersView />;
};

export default Page;
