import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";
import { webhookRouter } from "@calcom/trpc/server/routers/viewer/webhook/_router";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import Webhooks from "~/settings/platform/webhooks/webhooks-view";

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

  const caller = await createRouterCaller(webhookRouter);
  const data = await caller.getByViewer();

  return <Webhooks data={data} />;
};

export default ServerPageWrapper;
