import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyHeaders } from "@lib/buildLegacyCtx";

const OrgAdminOnlyLayout = async ({ children }: { children: React.ReactNode }) => {
  const req = {
    headers: buildLegacyHeaders(await headers()),
    cookies: (await cookies())
      .getAll()
      .reduce((acc, cookie) => ({ ...acc, [cookie.name]: cookie.value }), {}),
  } as any;
  const session = await getServerSession({ req });
  const userProfile = session?.user?.profile;
  const userId = session?.user?.id;
  const orgRole =
    session?.user?.org?.role ??
    userProfile?.organization?.members.find((m: { userId: number }) => m.userId === userId)?.role;
  const isOrgAdminOrOwner = checkAdminOrOwner(orgRole);

  if (!isOrgAdminOrOwner) {
    return redirect("/settings/organizations/profile");
  }

  return children;
};

export default OrgAdminOnlyLayout;
