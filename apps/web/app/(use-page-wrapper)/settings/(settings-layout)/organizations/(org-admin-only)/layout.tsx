import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const OrgAdminOnlyLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const isOrgAdminOrOwner = checkAdminOrOwner(session?.user?.org?.role);

  if (!isOrgAdminOrOwner) {
    return redirect("/settings/organizations/profile");
  }

  return children;
};

export default OrgAdminOnlyLayout;
