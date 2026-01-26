import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export async function checkInsightsPagePermission() {
  const featuresRepository = getFeatureRepository();
  const insightsEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("insights");

  if (!insightsEnabled) {
    redirect("/");
  }

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return session;
}
