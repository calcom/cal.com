import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export async function checkInsightsPermission() {
  const featuresRepository = new FeaturesRepository(prisma);
  const insightsEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("insights");

  if (!insightsEnabled) {
    redirect("/");
  }

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (session.user.org?.id) {
    const permissionCheckService = new PermissionCheckService();
    const hasPermission = await permissionCheckService.checkPermission({
      userId: session.user.id,
      teamId: session.user.org.id,
      permission: "insights.read",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });

    if (!hasPermission) {
      redirect("/");
    }
  }

  return session;
}
