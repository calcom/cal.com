import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { WebhookRepository } from "@calcom/features/webhooks/lib/repository/WebhookRepository";
import { APP_NAME } from "@calcom/lib/constants";
import { MembershipRole } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { EditWebhookView } from "~/webhooks/views/webhook-edit-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME }),
    undefined,
    undefined,
    `/settings/developer/webhooks/${(await params).id}`
  );

const Page = async ({ params: _params }: PageProps) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const params = await _params;
  const id = typeof params?.id === "string" ? params.id : undefined;

  const webhookRepository = WebhookRepository.getInstance();
  const webhook = await webhookRepository.findByWebhookId(id);

  // Ownership check: align with PBAC middleware in webhook/util.ts
  if (webhook.teamId) {
    const permissionService = new PermissionCheckService();
    const hasPermission = await permissionService.checkPermission({
      userId: session.user.id,
      teamId: webhook.teamId,
      permission: "webhook.read",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER],
    });
    if (!hasPermission) {
      notFound();
    }
  } else if (webhook.userId !== session.user.id) {
    notFound();
  }

  return <EditWebhookView webhook={webhook} />;
};

export default Page;
