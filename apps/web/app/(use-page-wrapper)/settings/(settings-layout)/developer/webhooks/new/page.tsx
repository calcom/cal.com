import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { NewWebhookView } from "@calcom/features/webhooks/pages/webhook-new-view";
import { APP_NAME } from "@calcom/lib/constants";
import { WebhookRepository } from "@calcom/lib/server/repository/webhook";
import { appsRouter } from "@calcom/trpc/server/routers/viewer/apps/_router";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME }),
    undefined,
    undefined,
    "/settings/developer/webhooks/new"
  );

const getCachedWebhooksList = unstable_cache(
  async ({ userId }: { userId: number }) => {
    return await WebhookRepository.findWebhooksByFilters({ userId });
  },
  undefined,
  { revalidate: 3600, tags: ["viewer.webhook.list"] }
);

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const appsCaller = await createRouterCaller(appsRouter);

  const [installedApps, webhooks] = await Promise.all([
    appsCaller.integrations({ variant: "other", onlyInstalled: true }),
    getCachedWebhooksList({ userId: session.user.id }),
  ]);

  return <NewWebhookView webhooks={webhooks} installedApps={installedApps} />;
};

export default Page;
