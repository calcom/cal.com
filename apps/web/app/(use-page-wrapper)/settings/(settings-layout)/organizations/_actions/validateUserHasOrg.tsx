import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export async function validateUserHasOrg() {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  const orgExists =
    session?.user?.org || session?.user?.profile?.organizationId || session?.user?.profile?.organization;

  if (!orgExists) {
    redirect("/settings/my-account/profile");
  }

  return session;
}
