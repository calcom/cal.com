import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export async function validateOrgAdminAccess() {
  const session = await getServerSession({
    req: buildLegacyRequest(await headers(), await cookies()),
  });

  if (!session?.user.id || !session?.user.profile?.organizationId || !session?.user.org) {
    return redirect("/settings/profile");
  }

  return session as typeof session & {
    user: typeof session.user & {
      profile: NonNullable<typeof session.user.profile> & {
        organizationId: NonNullable<typeof session.user.profile.organizationId>;
      };
      org: NonNullable<typeof session.user.org>;
    };
  };
}
