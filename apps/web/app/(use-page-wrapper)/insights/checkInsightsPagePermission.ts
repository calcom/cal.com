import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { hasInsightsPermission } from "@calcom/features/insights/server/hasInsightsPermission";
import { prisma } from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export async function checkInsightsPagePermission() {
  const featuresRepository = new FeaturesRepository(prisma);
  const insightsEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("insights");

  if (!insightsEnabled) {
    redirect("/");
  }

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const hasPermission = await hasInsightsPermission({
    userId: session.user.id,
    organizationId: session.user.org?.id,
  });

  if (!hasPermission) {
    redirect("/");
  }

  return session;
}
