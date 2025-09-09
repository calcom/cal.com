import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export async function validateUserHasOrgAdmin() {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  const orgExists =
    session?.user?.org || session?.user?.profile?.organizationId || session?.user?.profile?.organization;

  if (!orgExists) {
    redirect("/settings/my-account/profile");
  }

  const userProfile = session?.user?.profile;
  const userId = session?.user?.id;
  const orgRole =
    session?.user?.org?.role ??
    userProfile?.organization?.members.find((m: { userId: number }) => m.userId === userId)?.role;
  const isOrgAdminOrOwner = checkAdminOrOwner(orgRole);

  if (!isOrgAdminOrOwner) {
    redirect("/settings/organizations/profile");
  }

  return session;
}
