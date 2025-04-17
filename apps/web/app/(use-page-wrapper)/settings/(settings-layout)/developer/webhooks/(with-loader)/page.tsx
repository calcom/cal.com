import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import WebhooksView from "@calcom/features/webhooks/pages/webhooks-view";
import { APP_NAME } from "@calcom/lib/constants";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { webhookRouter } from "@calcom/trpc/server/routers/viewer/webhook/_router";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME })
  );

const WebhooksViewServerWrapper = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const isAdmin = session.user.role === UserPermissionRole.ADMIN;
  const caller = await createRouterCaller(webhookRouter);
  const data = await caller.getByViewer();

  return <WebhooksView data={data} isAdmin={isAdmin} />;
};

export default WebhooksViewServerWrapper;
