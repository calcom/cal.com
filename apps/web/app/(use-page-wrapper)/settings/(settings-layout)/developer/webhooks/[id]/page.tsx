import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { WebhookRepository } from "@calcom/features/webhooks/lib/repository/WebhookRepository";
import prisma from "@calcom/prisma";
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

  // Ownership check: verify user has access to this webhook
  if (webhook.teamId) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        teamId: webhook.teamId,
        role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER] },
      },
      select: { id: true },
    });
    if (!membership) {
      notFound();
    }
  } else if (webhook.userId !== session.user.id) {
    notFound();
  }

  return <EditWebhookView webhook={webhook} />;
};

export default Page;
