import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import AddOAuthClientWebhook from "~/settings/platform/webhooks/add-webhooks-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("platform_webhooks"),
    (t) => t("platform_webhooks_description", { appName: APP_NAME }),
    undefined,
    undefined,
    "/settings/platform/webhooks"
  );
};

const ServerPageWrapper = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return <AddOAuthClientWebhook />;
};

export default ServerPageWrapper;
