import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import WebhooksView from "@calcom/features/webhooks/pages/webhooks-view";
import { APP_NAME } from "@calcom/lib/constants";
import { WebhookRepository } from "@calcom/lib/server/repository/webhook";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME }),
    undefined,
    undefined,
    "/settings/developer/webhooks"
  );

const getCachedWebhooksList = unstable_cache(
  async ({ userId, userRole }: { userId: number; userRole?: UserPermissionRole }) => {
    return await WebhookRepository.getAllWebhooksByUserId({
      userId,
      userRole,
    });
  },
  undefined,
  { revalidate: 3600, tags: ["viewer.webhook.getByViewer"] }
);

const WebhooksViewServerWrapper = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const isAdmin = session.user.role === UserPermissionRole.ADMIN;
  const userRole = session.user.role !== "INACTIVE_ADMIN" ? session.user.role : undefined;

  const data = await getCachedWebhooksList({ userId: session.user.id, userRole });

  return <WebhooksView data={data} isAdmin={isAdmin} />;
};

export default WebhooksViewServerWrapper;
